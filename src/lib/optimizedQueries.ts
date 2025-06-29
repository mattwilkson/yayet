// File: src/lib/optimizedQueries.ts
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { supabase } from './supabase'

// ————————————————————————————————
// PERFORMANCE MONITORING
// ————————————————————————————————
export const performanceMonitor = {
  startTimer: (operation: string) => {
    const start = performance.now()
    return {
      end: () => {
        const duration = performance.now() - start
        console.log(`⏱️ ${operation} took ${duration.toFixed(2)}ms`)
        if (duration > 1000) {
          console.warn(`🐌 Slow operation detected: ${operation} (${duration.toFixed(2)}ms)`)
        }
        return duration
      }
    }
  }
}

// ————————————————————————————————
// SIMPLE IN-MEMORY CACHE
// ————————————————————————————————
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
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
  clear(): void {
    this.cache.clear()
  }
  size(): number {
    return this.cache.size
  }
  keys(): string[] {
    return Array.from(this.cache.keys())
  }
}

const queryCache = new QueryCache()

// ————————————————————————————————
// DASHBOARD DATA
// ————————————————————————————————
export const fetchOptimizedDashboardData = async (
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) => {
  const timer = performanceMonitor.startTimer('fetchOptimizedDashboardData')
  const cacheKey = `dashboard-${familyId}-${currentDate.toDateString()}-${viewMode}-${userId||'all'}`

  const cached = queryCache.get(cacheKey)
  if (cached) {
    console.log('📊 Using cached dashboard data')
    timer.end()
    return cached
  }

  console.log('📊 Fetching fresh dashboard data')
  const [familyInfo, events, familyMembers] = await Promise.all([
    fetchOptimizedFamilyInfo(familyId),
    fetchOptimizedEvents(familyId, currentDate, viewMode, userId),
    fetchOptimizedFamilyMembers(familyId)
  ])

  const result = { familyInfo, events, familyMembers, timestamp: Date.now() }
  queryCache.set(cacheKey, result, 3 * 60 * 1000)
  timer.end()
  return result
}

// ————————————————————————————————
// FAMILY INFO
// ————————————————————————————————
const fetchOptimizedFamilyInfo = async (familyId: string) => {
  const cacheKey = `family-info-${familyId}`
  const cached = queryCache.get(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('families')
    .select('id, family_name, admin_user_id, created_at')
    .eq('id', familyId)
    .single()
  if (error) throw error

  queryCache.set(cacheKey, data, 10 * 60 * 1000)
  return data
}

// ————————————————————————————————
// FAMILY MEMBERS
// ————————————————————————————————
const fetchOptimizedFamilyMembers = async (familyId: string) => {
  const cacheKey = `family-members-${familyId}`
  const cached = queryCache.get(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from('family_members')
    .select('id, name, nickname, relationship, category, color, role, user_id, birthday, anniversary, address')
    .eq('family_id', familyId)
    .order('name')
  if (error) throw error

  queryCache.set(cacheKey, data||[], 5 * 60 * 1000)
  return data || []
}

// ————————————————————————————————
// HOLIDAYS
// ————————————————————————————————
const fetchOptimizedHolidays = async (startDate: Date, endDate: Date) => {
  const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`
  const cacheKey = `holidays-${monthKey}`
  const cached = queryCache.get(cacheKey)
  if (cached) {
    return (cached as any[]).filter(h => {
      const d = new Date(h.start_time)
      return d >= startDate && d <= endDate
    })
  }

  const { fetchHolidays, convertHolidaysToEvents } = await import('./holidays')
  const raw = await fetchHolidays(
    new Date(startDate.getFullYear(), startDate.getMonth(), 1),
    new Date(startDate.getFullYear(), startDate.getMonth()+1, 0)
  )
  const evs = convertHolidaysToEvents(raw)
  queryCache.set(cacheKey, evs, 24 * 60 * 60 * 1000)
  return evs.filter(h => {
    const d = new Date(h.start_time)
    return d >= startDate && d <= endDate
  })
}

// ————————————————————————————————
// SPECIAL EVENTS
// ————————————————————————————————
const fetchOptimizedSpecialEvents = async (familyId: string, startDate: Date, endDate: Date) => {
  const monthKey = `${familyId}-${startDate.getFullYear()}-${startDate.getMonth()}`
  const cacheKey = `special-events-${monthKey}`
  const cached = queryCache.get(cacheKey)
  if (cached) {
    return (cached as any[]).filter(e => {
      const d = new Date(e.start_time)
      return d >= startDate && d <= endDate
    })
  }

  const { generateSpecialEvents } = await import('./specialEvents')
  const evs = await generateSpecialEvents(
    familyId,
    new Date(startDate.getFullYear(), startDate.getMonth(), 1),
    new Date(startDate.getFullYear(), startDate.getMonth()+1, 0)
  )
  queryCache.set(cacheKey, evs, 60 * 60 * 1000)
  return evs.filter(e => {
    const d = new Date(e.start_time)
    return d >= startDate && d <= endDate
  })
}

// ————————————————————————————————
// EVENTS (with color & assignments)
// ————————————————————————————————
export const fetchOptimizedEvents = async (
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) => {
  const timer = performanceMonitor.startTimer('fetchOptimizedEvents')
  const weekStart  = startOfWeek(currentDate)
  const rangeStart = subWeeks(weekStart, 2)
  const rangeEnd   = addWeeks(weekStart, 4)

  const { recurringEventManager } = await import('./recurringEventManager')
  let evs = await recurringEventManager.getEventsForDateRange(familyId, rangeStart, rangeEnd)

  if (viewMode === 'personal' && userId) {
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    evs = member
      ? evs.filter(e => e.event_assignments?.some((a: any) => a.family_member_id === member.id))
      : []
  }

  const [hol, spec] = await Promise.all([
    fetchOptimizedHolidays(rangeStart, rangeEnd),
    fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
  ])
  const allEvents = [...evs, ...hol, ...spec]
  if (!allEvents.length) { timer.end(); return [] }

  // fetch assignments + colors
  const ids = allEvents.map(e => e.id)
  const { data: assigns = [], error: ae } = await supabase
    .from('event_assignments')
    .select('event_id, is_driver_helper, family_member_id, family_members(id, color)')
    .in('event_id', ids)
  if (ae) throw ae

  const map = assigns.reduce<Record<string, any[]>>((m, a) => {
    (m[a.event_id] ||= []).push(a)
    return m
  }, {})

  const final = allEvents.map(e => {
    const ass = map[e.id] || []
    const primary = ass.find(a => !a.is_driver_helper)?.family_members
    return { ...e, event_assignments: ass, color: primary?.color ?? '#999' }
  })

  timer.end()
  return final
}

// ————————————————————————————————
// CACHE UTILITIES
// ————————————————————————————————
export const cacheUtils = {
  clearAll: () => {
    queryCache.clear()
    console.log('🗑️ Cleared entire cache')
  },
  clearFamily: (familyId: string) => {
    queryCache
      .keys()
      .filter(k => k.includes(familyId))
      .forEach(k => queryCache.get(k) && queryCache.clear())
    console.log(`🗑️ Cleared cache for family ${familyId}`)
  },
  stats: () => ({ entries: queryCache.size() })
}