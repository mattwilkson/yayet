// File: src/lib/optimizedQueries.ts
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { supabase } from './supabase'
import { performanceMonitor } from './optimizedQueries'  // adjust your imports as needed

const fetchOptimizedEvents = async (
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) => {
  const timer = performanceMonitor.startTimer('fetchOptimizedEvents')

  // 1) get your date window
  const weekStart  = startOfWeek(currentDate)
  const rangeStart = subWeeks(weekStart, 2)
  const rangeEnd   = addWeeks(weekStart, 4)

  try {
    // 2) load recurring / holidays / special events
    const { recurringEventManager } = await import('./recurringEventManager')
    let familyEvents = await recurringEventManager.getEventsForDateRange(
      familyId,
      rangeStart,
      rangeEnd
    )

    // 3) filter for “personal” view
    if (viewMode === 'personal' && userId) {
      const { data: userMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (userMember) {
        familyEvents = familyEvents.filter(ev =>
          ev.event_assignments?.some((a: any) => a.family_member_id === userMember.id)
        )
      } else {
        familyEvents = []
      }
    }

    // 4) load holidays & special
    const [holidays, specialEvents] = await Promise.all([
      fetchOptimizedHolidays(rangeStart, rangeEnd),
      fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
    ])

    const allEvents = [...familyEvents, ...holidays, ...specialEvents]

    if (allEvents.length === 0) {
      timer.end()
      return []
    }

    // 5) batch‐fetch *all* assignments for those events in one go:
    const eventIds = allEvents.map(e => e.id)
    const { data: assignments = [], error: assignErr } = await supabase
      .from('event_assignments')
      .select(`
        event_id,
        is_driver_helper,
        family_member_id,
        family_members ( id, name, color )
      `)
      .in('event_id', eventIds)

    if (assignErr) throw assignErr

    // 6) group by event_id
    const assignmentMap = assignments.reduce((map, a) => {
      (map[a.event_id] ||= []).push(a)
      return map
    }, {} as Record<string, typeof assignments>)

    // 7) attach assignments + pick a “calendar color” from the primary member
    const eventsWithAssignments = allEvents.map(e => {
      const assigns = assignmentMap[e.id] || []
      const primary = assigns.find(a => !a.is_driver_helper)?.family_members
      return {
        ...e,
        event_assignments: assigns,
        color: primary?.color ?? '#999'
      }
    })

    timer.end()
    return eventsWithAssignments
  } catch (err) {
    timer.end()
    throw err
  }
}