// File: src/lib/optimizedQueries.ts
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { supabase } from './supabase'
import { performanceMonitor } from './optimizedQueries' // adjust path if needed...

// Helper to strip “UUID-date” composite IDs back to their pure UUID parent
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5
    ? parts.slice(0, 5).join('-')
    : eventId
}

export const fetchOptimizedEvents = async (
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) => {
  const timer = performanceMonitor.startTimer('fetchOptimizedEvents')

  // narrow our range
  const weekStart  = startOfWeek(currentDate)
  const rangeStart = subWeeks(weekStart, 2)
  const rangeEnd   = addWeeks(weekStart, 4)

  // load recurring + exceptions
  const { recurringEventManager } = await import('./recurringEventManager')
  let allEvents = await recurringEventManager.getEventsForDateRange(
    familyId, rangeStart, rangeEnd
  )

  // personal-only filter
  if (viewMode === 'personal' && userId) {
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    allEvents = member
      ? allEvents.filter(e =>
          e.event_assignments?.some((a: any) =>
            a.family_member_id === member.id
          )
        )
      : []
  }

  // fetch holidays & specials
  const [holidays, specials] = await Promise.all([
    fetchOptimizedHolidays(rangeStart, rangeEnd),
    fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
  ])

  allEvents = [...allEvents, ...holidays, ...specials]

  if (allEvents.length === 0) {
    timer.end()
    return []
  }

  // build list of parent IDs (strip any "-YYYY-MM-DD" suffix)
  const parentIds = Array.from(new Set(
    allEvents.map(e => extractParentEventId(e.id))
  ))

  // fetch all assignments for those parent IDs
  const { data: assigns = [], error: ae } = await supabase
    .from('event_assignments')
    .select('event_id, is_driver_helper, family_member_id, family_members(id, color)')
    .in('event_id', parentIds)

  if (ae) throw ae

  // group by parent event_id
  const map: Record<string, typeof assigns> = {}
  assigns.forEach(a => {
    const pid = a.event_id
    if (!map[pid]) map[pid] = []
    map[pid].push(a)
  })

  // re-attach assignments & pick primary color
  const result = allEvents.map(e => {
    const pid = extractParentEventId(e.id)
    const evAssigns = map[pid] || []
    const primary = evAssigns.find(a => !a.is_driver_helper)?.family_members
    return {
      ...e,
      event_assignments: evAssigns,
      color: primary?.color ?? '#999'
    }
  })

  timer.end()
  return result
}