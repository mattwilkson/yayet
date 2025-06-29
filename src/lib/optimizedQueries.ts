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
  size() { return this.cache.size }
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
  clearAll: () => { queryCache.clear(); console.log('🗑️ cleared all cache') },
  clearFamily: (familyId: string) => {
    for (const key of Array.from((queryCache as any).cache.keys())) {
      if (key.includes(familyId)) (queryCache as any).cache.delete(key)
    }
    console.log(`🗑️ cleared cache for family ${familyId}`)
  },
  stats: () => ({ entries: queryCache.size() })
}

// ————————————————————————————————————————
// Helper for recurring-series keys
// ————————————————————————————————————————
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5 ? parts.slice(0, 5).join('-') : eventId
}

// ————————————————————————————————————————
// Fetch Holidays
// ————————————————————————————————————————
async function fetchOptimizedHolidays(start: Date, end: Date) {
  const monthKey = `${start.getUTCFullYear()}-${start.getUTCMonth()}`
  const cacheKey = `holidays-${monthKey}`
  const cached = queryCache.get<any[]>(cacheKey)
  if (cached) {
    return cached.filter(h => {
      const d = new Date(h.start_time)
      return d >= start && d <= end
    })
  }

  // load entire month once
  const monthStart = new Date(start.getUTCFullYear(), start.getUTCMonth(), 1)
  const monthEnd   = new Date(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)

  const { data, error } = await supabase
    .from('holidays')
    .select('id, name, date')
    .gte('date', monthStart.toISOString())
    .lte('date', monthEnd.toISOString())

  if (error) throw error

  const holidayEvents = (data || []).map(h => ({
    id: `holiday-${h.id}`,
    title: h.name,
    start_time: new Date(h.date).toISOString(),
    end_time:   new Date(h.date).toISOString(),
    all_day:    true,
    isHoliday:  true,
    event_assignments: [] as any[],
  }))

  // cache for 24h
  queryCache.set(cacheKey, holidayEvents, 24 * 60 * 60 * 1000)
  return holidayEvents.filter(h => {
    const d = new Date(h.start_time)
    return d >= start && d <= end
  })
}

// ————————————————————————————————————————
// Fetch Special Events (if used)
// ————————————————————————————————————————
async function fetchOptimizedSpecialEvents(familyId: string, start: Date, end: Date) {
  // implement your special-events logic here
  return [] as any[]
}

// ————————————————————————————————————————
// Fetch family info
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

// ————————————————————————————————————————
// Fetch family members
// ————————————————————————————————————————
async function fetchOptimizedFamilyMembers(familyId: string) {
  const key = `family-members-${familyId}`
  const cached = queryCache.get<any[]>(key)
  if (cached) return cached

  const { data, error } = await supabase
    .from('family_members')
    .select('id, name, nickname, relationship, category, color, user_id, birthday')
    .eq('family_id', familyId)
    .order('name')
  if (error) throw error

  queryCache.set(key, data || [], 5 * 60 * 1000)
  return data || []
}

// ————————————————————————————————————————
// Fetch events + assignments
// ————————————————————————————————————————
export async function fetchOptimizedEvents(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const t = performanceMonitor.startTimer('fetchOptimizedEvents')

  // 1) recurring + exceptions
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
    events = me
      ? events.filter(e =>
          e.event_assignments?.some((a:any) => a.family_member_id === me.id)
        )
      : []
  }

  // 3) load holidays + specials
  const [hols, specs] = await Promise.all([
    fetchOptimizedHolidays(rangeStart, rangeEnd),
    fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
  ])
  events = [...events, ...hols, ...specs]

  if (!events.length) {
    t.end()
    return []
  }

  // 4) pull parent IDs
  const parentIds = Array.from(new Set(events.map(e => extractParentEventId(e.id))))

  // 5) fetch assignments in one shot
  const { data: assigns = [], error: ae } = await supabase
    .from('event_assignments')
    .select('event_id,is_driver_helper,family_member_id,family_members(id,color)')
    .in('event_id', parentIds)
  if (ae) throw ae

  // 6) group by parent
  const groups: Record<string, typeof assigns> = {}
  assigns.forEach(a => {
    groups[a.event_id] = groups[a.event_id] || []
    groups[a.event_id].push(a)
  })

  // 7) annotate & pick color
  const out = events.map(e => {
    const pid = extractParentEventId(e.id)
    const evAs = groups[pid] || []
    const primary = evAs.find(a => !a.is_driver_helper)?.family_members
    return { ...e, event_assignments: evAs, color: primary?.color ?? '#888' }
  })

  t.end()
  return out
}

// ————————————————————————————————————————
// Top-level fetch
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
    fetchOptimizedFamilyInfo(familyId),
    fetchOptimizedEvents(familyId, currentDate, viewMode, userId),
    fetchOptimizedFamilyMembers(familyId)
  ])
  const result = { familyInfo, events, familyMembers, timestamp: Date.now() }
  queryCache.set(key, result, 3 * 60 * 1000)
  t.end()
  return result
}