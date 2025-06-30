// File: src/lib/optimizedQueries.ts
import { startOfWeek, subWeeks, addWeeks } from 'date-fns'
import { supabase } from './supabase'

// ———————————————————————————————————————————————
// Simple in-memory cache
// ———————————————————————————————————————————————
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}
class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || (Date.now() - entry.timestamp) > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }
  clear() { this.cache.clear() }
  get size() { return this.cache.size }
}
const queryCache = new QueryCache()

// ———————————————————————————————————————————————
// Performance timer
// ———————————————————————————————————————————————
export const performanceMonitor = {
  startTimer: (label: string) => {
    const t0 = performance.now()
    return {
      end: () => {
        const dt = performance.now() - t0
        console.log(`⏱️ ${label} took ${dt.toFixed(1)}ms`)
        if (dt > 1000) console.warn(`🐌 Slow: ${label}`)
        return dt
      }
    }
  }
}

// ———————————————————————————————————————————————
// Cache utils
// ———————————————————————————————————————————————
export const cacheUtils = {
  clearAll: () => {
    queryCache.clear()
    console.log('🗑️ cleared all cache')
  },
  clearFamily: (familyId: string) => {
    for (const key of queryCache['cache'].keys()) {
      if (key.includes(familyId)) queryCache['cache'].delete(key)
    }
    console.log(`🗑️ cleared cache for family ${familyId}`)
  },
  stats: () => ({
    entries: queryCache.size
  })
}

// ———————————————————————————————————————————————
// Helpers
// ———————————————————————————————————————————————
function extractParentEventId(eventId: string): string {
  // if it's like "550e8400-e29b-41d4-a716-446655440000-2025-06-23",
  // drop after the 5th hyphenized segment
  const parts = eventId.split('-')
  return parts.length === 6
    ? parts.slice(0,5).join('-')
    : eventId
}
// Simple UUID v4 regex for filtering out "holiday-…" etc.
const uuidV4Regexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ———————————————————————————————————————————————
// Fetch recurring + holidays + specials, then assignments
// ———————————————————————————————————————————————
export async function fetchOptimizedEvents(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const timer = performanceMonitor.startTimer('fetchOptimizedEvents')

  // 1) recurring series + exceptions
  const { recurringEventManager } = await import('./recurringEventManager')
  const weekStart  = startOfWeek(currentDate)
  const rangeStart = subWeeks(weekStart, 2)
  const rangeEnd   = addWeeks(weekStart, 4)
  let events = await recurringEventManager.getEventsForDateRange(
    familyId, rangeStart, rangeEnd
  )

  // 2) personal filter
  if (viewMode === 'personal' && userId) {
    const { data: me } = await supabase
      .from('family_members')
      .select('id').eq('user_id', userId).maybeSingle()
    events = me
      ? events.filter(e =>
          e.event_assignments?.some((a:any)=>a.family_member_id === me.id)
        )
      : []
  }

  // 3) holidays + specials
  const [holidays, specials] = await Promise.all([
    import('./holidays').then(m => m.fetchHolidays(rangeStart, rangeEnd)).then(m => m.map(h => ({ ...h, isHoliday: true }))),
    import('./specialEvents').then(m => m.generateSpecialEvents(familyId, rangeStart, rangeEnd))
  ])
  events = [...events, ...holidays, ...specials]

  // 4) if empty
  if (!events.length) {
    timer.end()
    return []
  }

  // 5) parent IDs, but only real UUIDs
  const parentIds = Array.from(new Set(
    events
      .map(e => extractParentEventId(e.id))
      .filter(id => uuidV4Regexp.test(id))
  ))

  // 6) batch-fetch assignments
  const { data: assigns = [], error: ae } = await supabase
    .from('event_assignments')
    .select('event_id,is_driver_helper,family_member_id,family_members(id,color)')
    .in('event_id', parentIds)
  if (ae) throw ae

  // 7) group & re-attach + pick a color
  const byParent: Record<string, typeof assigns> = {}
  assigns.forEach(a => {
    byParent[a.event_id] = byParent[a.event_id] || []
    byParent[a.event_id].push(a as any)
  })

  const out = events.map(e => {
    const pid = extractParentEventId(e.id)
    const evAs = byParent[pid] || []
    const primary = evAs.find(a => !a.is_driver_helper)?.family_members
    return {
      ...e,
      event_assignments: evAs,
      color: primary?.color ?? '#888'
    }
  })

  timer.end()
  return out
}

// ———————————————————————————————————————————————
// Top-level dashboard fetch
// ———————————————————————————————————————————————
export async function fetchOptimizedDashboardData(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const timer = performanceMonitor.startTimer('fetchOptimizedDashboardData')
  const cacheKey = `dashboard-${familyId}-${currentDate.toDateString()}-${viewMode}-${userId||'all'}`
  const cached = queryCache.get(cacheKey)
  if (cached) {
    console.log('📊 using cached dashboard')
    timer.end()
    return cached
  }

  const [familyInfo, events, familyMembers] = await Promise.all([
    // your existing fetchOptimizedFamilyInfo here…
    import('./optimizedQueries.familyInfo').then(m => m.fetchOptimizedFamilyInfo(familyId)),
    fetchOptimizedEvents(familyId, currentDate, viewMode, userId),
    import('./optimizedQueries.familyMembers').then(m => m.fetchOptimizedFamilyMembers(familyId))
  ])

  const result = { familyInfo, events, familyMembers, timestamp: Date.now() }
  queryCache.set(cacheKey, result, 3 * 60 * 1000)
  timer.end()
  return result
}