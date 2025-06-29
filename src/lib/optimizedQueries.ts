// File: src/lib/optimizedQueries.ts
import { startOfWeek, subWeeks, addWeeks } from 'date-fns'
import { supabase } from './supabase'
import { performanceMonitor, cacheUtils } from './cacheAndPerf' // or wherever you keep cacheUtils & perf

/** Strips any “-YYYY-MM-DD” suffixes, but we’ll also use it to normalize IDs */
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5 ? parts.slice(0, 5).join('-') : eventId
}

/** Returns true if `id` is a standard 36-char UUID v4 */
function looksLikeUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

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
    familyId,
    rangeStart,
    rangeEnd
  )

  // 2) personal-view filter
  if (viewMode === 'personal' && userId) {
    const { data: me } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    events = me
      ? events.filter(e =>
          e.event_assignments?.some(a => a.family_member_id === me.id)
        )
      : []
  }

  // 3) holidays + special events
  const [holidays, specials] = await Promise.all([
    fetchOptimizedHolidays(rangeStart, rangeEnd),
    fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
  ])
  events = [...events, ...holidays, ...specials]

  // 4) collect all parent IDs, then only keep valid UUIDs
  const parentIds = Array.from(
    new Set(events.map(e => extractParentEventId(e.id)))
  )
  const validParentIds = parentIds.filter(looksLikeUuid)

  // 5) fetch assignments only if we have some
  let assignments: any[] = []
  if (validParentIds.length) {
    const { data, error } = await supabase
      .from('event_assignments')
      .select('event_id,is_driver_helper,family_member_id,family_members(id,color)')
      .in('event_id', validParentIds)
    if (error) throw error
    assignments = data || []
  }

  // 6) group assignments by parent ID
  const groups: Record<string, typeof assignments> = {}
  for (const a of assignments) {
    const pid = a.event_id
    groups[pid] = groups[pid] || []
    groups[pid].push(a)
  }

  // 7) merge back into events, pick a primary color
  const out = events.map(e => {
    const pid = extractParentEventId(e.id)
    const evAs = groups[pid] || []
    const primary = evAs.find(a => !a.is_driver_helper)?.family_members
    return { ...e, event_assignments: evAs, color: primary?.color ?? '#888' }
  })

  timer.end()
  return out
}

/** Top-level fetch that your DashboardPage calls */
export async function fetchOptimizedDashboardData(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const timer = performanceMonitor.startTimer('fetchOptimizedDashboardData')
  const cacheKey = `dashboard-${familyId}-${currentDate.toDateString()}-${viewMode}-${userId||'all'}`
  const cached = cacheUtils.get(cacheKey)
  if (cached) {
    timer.end()
    return cached
  }

  // fetch in parallel
  const [familyInfo, events, familyMembers] = await Promise.all([
    fetchOptimizedFamilyInfo(familyId),
    fetchOptimizedEvents(familyId, currentDate, viewMode, userId),
    fetchOptimizedFamilyMembers(familyId)
  ])

  const result = { familyInfo, events, familyMembers, timestamp: Date.now() }
  cacheUtils.set(cacheKey, result, 3 * 60 * 1000)
  timer.end()
  return result
}