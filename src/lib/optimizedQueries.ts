// File: src/lib/optimizedQueries.ts
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { supabase } from './supabase'

// ————————————————————————————————————————
// Simple in-memory cache
// ————————————————————————————————————————
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}
class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000
  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl })
  }
  get<T>(key: string): T | null {
    const e = this.cache.get(key)
    if (!e || Date.now() - e.timestamp > e.ttl) {
      this.cache.delete(key)
      return null
    }
    return e.data
  }
  clear() { this.cache.clear() }
  get size() { return this.cache.size }
}
const queryCache = new QueryCache()

// ————————————————————————————————————————
// Performance timer
// ————————————————————————————————————————
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

// ————————————————————————————————————————
// Cache utils
// ————————————————————————————————————————
export const cacheUtils = {
  clearAll: () => {
    queryCache.clear()
    console.log('🗑️ cleared all cache')
  },
  clearFamily: (familyId: string) => {
    for (const key of Array.from((queryCache as any).cache.keys())) {
      if (key.includes(familyId)) {
        ;(queryCache as any).cache.delete(key)
      }
    }
    console.log(`🗑️ cleared cache for family ${familyId}`)
  },
  stats: () => ({
    entries: queryCache.size
  })
}

// ————————————————————————————————————————
// Helpers
// ————————————————————————————————————————
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5 ? parts.slice(0, 5).join('-') : eventId
}

// ————————————————————————————————————————
// Placeholder: fetch holidays (return [])
// ————————————————————————————————————————
async function fetchOptimizedHolidays(start: Date, end: Date) {
  // TODO: wire your real holiday-fetching logic
  return []
}

// ————————————————————————————————————————
// Placeholder: fetch special events (return [])
// ————————————————————————————————————————
async function fetchOptimizedSpecialEvents(familyId: string, start: Date, end: Date) {
  // TODO: wire your real special-event logic
  return []
}

// ————————————————————————————————————————
// Fetch recurring + one-off events + assignments
// ————————————————————————————————————————
export async function fetchOptimizedEvents(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const t = performanceMonitor.startTimer('fetchOptimizedEvents')

  // 1) recurring series & exceptions
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
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (me) {
      events = events.filter(e =>
        e.event_assignments?.some((a:any) => a.family_member_id === me.id)
      )
    } else {
      events = []
    }
  }

  // 3) holidays & specials
  const [hols, specs] = await Promise.all([
    fetchOptimizedHolidays(rangeStart, rangeEnd),
    fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
  ])
  events = [...events, ...hols, ...specs]

  // if none, bail
  if (!events.length) {
    t.end()
    return []
  }

  // 4) collect *parent* IDs
  const parentIds = Array.from(new Set(events.map(e => extractParentEventId(e.id))))

  // 5) fetch all assignments for those parents
  const { data: assigns = [], error: ae } = await supabase
    .from('event_assignments')
    .select('event_id,is_driver_helper,family_member_id,family_members(id,color)')
    .in('event_id', parentIds)
  if (ae) throw ae

  // 6) group by parent
  const groups: Record<string, typeof assigns> = {}
  assigns.forEach(a => {
    const pid = a.event_id
    groups[pid] = groups[pid] || []
    groups[pid].push(a)
  })

  // 7) attach assignments + pick a color
  const out = events.map(e => {
    const pid = extractParentEventId(e.id)
    const evAs = groups[pid] || []
    const primary = evAs.find(a => !a.is_driver_helper)?.family_members
    return {
      ...e,
      event_assignments: evAs,
      color: primary?.color ?? '#888'
    }
  })

  t.end()
  return out
}

// ————————————————————————————————————————
// Top-level dashboard fetch
// ————————————————————————————————————————
export async function fetchOptimizedDashboardData(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const t = performanceMonitor.startTimer('fetchOptimizedDashboardData')
  const key = `dashboard-${familyId}-${currentDate.toDateString()}-${viewMode}-${userId||'all'}`

  const cached = queryCache.get(key)
  if (cached) {
    t.end()
    return cached
  }

  const [familyInfo, events, familyMembers] = await Promise.all([
    // fetch familyInfo if you have a helper
    supabase.from('families').select('id, family_name').eq('id', familyId).maybeSingle().then(r=>r.data),
    fetchOptimizedEvents(familyId, currentDate, viewMode, userId),
    supabase.from('family_members').select('*').eq('family_id', familyId).then(r=>r.data || [])
  ])

  const result = { familyInfo, events, familyMembers, timestamp: Date.now() }
  queryCache.set(key, result, 3 * 60 * 1000 /* 3m */)
  t.end()
  return result
}