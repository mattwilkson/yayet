// File: src/lib/optimizedQueries.ts
import { startOfWeek, subWeeks, addWeeks } from 'date-fns'
import { supabase } from './supabase'

// ————————————————————————————————————————
// Simple in-memory cache for queries
// ————————————————————————————————————————
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
    if (!entry) return null
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }
  clear() {
    this.cache.clear()
  }
  size() {
    return this.cache.size
  }
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
    // @ts-ignore
    for (const key of Array.from((queryCache as any).cache.keys())) {
      if (key.includes(familyId)) {
        // @ts-ignore
        (queryCache as any).cache.delete(key)
      }
    }
    console.log(`🗑️ cleared cache for family ${familyId}`)
  },
  stats: () => ({
    entries: queryCache.size()
  })
}

// ————————————————————————————————————————
// Helpers
// ————————————————————————————————————————
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5 ? parts.slice(0, 5).join('-') : eventId
}
function looksLikeUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// ————————————————————————————————————————
// Placeholder holiday & special fetchers (implement or import your real logic)
// ————————————————————————————————————————
async function fetchOptimizedHolidays(start: Date, end: Date) {
  // TODO: import & return real holidays here
  return []
}
async function fetchOptimizedSpecialEvents(familyId: string, start: Date, end: Date) {
  // TODO: import & return real special events here
  return []
}

// ————————————————————————————————————————
// Core: fetch recurring + assignments + holidays + specials
// ————————————————————————————————————————
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
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (me) {
      events = events.filter(e =>
        e.event_assignments?.some(a => a.family_member_id === me.id)
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

  // 4) collect parent IDs and only keep valid UUIDs
  const allParents = Array.from(new Set(events.map(e => extractParentEventId(e.id))))
  const uuidParents = allParents.filter(looksLikeUuid)

  // 5) bulk‐fetch assignments for those parents
  let assigns: any[] = []
  if (uuidParents.length) {
    const { data, error } = await supabase
      .from('event_assignments')
      .select('event_id,is_driver_helper,family_member_id,family_members(id,color)')
      .in('event_id', uuidParents)
    if (error) throw error
    assigns = data || []
  }

  // 6) group by parent
  const groups: Record<string, typeof assigns> = {}
  assigns.forEach(a => {
    groups[a.event_id] = groups[a.event_id] || []
    groups[a.event_id].push(a)
  })

  // 7) reattach and pick event color
  const out = events.map(e => {
    const pid = extractParentEventId(e.id)
    const evAs = groups[pid] || []
    const primary = evAs.find(a => !a.is_driver_helper)?.family_members
    return { ...e, event_assignments: evAs, color: primary?.color ?? '#888' }
  })

  timer.end()
  return out
}

// ————————————————————————————————————————
// Top‐level dashboard fetch
// ————————————————————————————————————————
export async function fetchOptimizedDashboardData(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const timer = performanceMonitor.startTimer('fetchOptimizedDashboardData')
  const key = `dashboard-${familyId}-${currentDate.toDateString()}-${viewMode}-${userId||'all'}`
  const cached = queryCache.get(key)
  if (cached) {
    timer.end()
    return cached
  }

  const [familyInfo, events, familyMembers] = await Promise.all([
    fetchOptimizedFamilyInfo(familyId),
    fetchOptimizedEvents(familyId, currentDate, viewMode, userId),
    fetchOptimizedFamilyMembers(familyId)
  ])

  const result = { familyInfo, events, familyMembers, timestamp: Date.now() }
  queryCache.set(key, result, 3 * 60 * 1000)
  timer.end()
  return result
}

// ————————————————————————————————————————
// Helpers for dashboard fetch
// ————————————————————————————————————————
async function fetchOptimizedFamilyInfo(familyId: string) {
  const key = `family-info-${familyId}`
  const cached = queryCache.get(key)
  if (cached) return cached

  const { data, error } = await supabase
    .from('families')
    .select('id, family_name, admin_user_id')
    .eq('id', familyId)
    .single()
  if (error) throw error
  queryCache.set(key, data, 10 * 60 * 1000)
  return data
}

async function fetchOptimizedFamilyMembers(familyId: string) {
  const key = `family-members-${familyId}`
  const cached = queryCache.get(key)
  if (cached) return cached

  const { data, error } = await supabase
    .from('family_members')
    .select('id,name,nickname,relationship,category,color,user_id,birthday')
    .eq('family_id', familyId)
    .order('name')
  if (error) throw error
  queryCache.set(key, data||[], 5 * 60 * 1000)
  return data || []
}