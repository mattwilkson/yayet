// File: src/lib/optimizedQueries.ts
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { supabase } from './supabase'

// PERFORMANCE MONITORING (defined once at top)
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

// … your QueryCache and fetchOptimizedDashboardData & helpers go here …

// Optimized event fetching with assignment + color enrichment
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

  try {
    const { recurringEventManager } = await import('./recurringEventManager')
    let familyEvents = await recurringEventManager.getEventsForDateRange(
      familyId,
      rangeStart,
      rangeEnd
    )

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

    const [holidays, specialEvents] = await Promise.all([
      fetchOptimizedHolidays(rangeStart, rangeEnd),
      fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
    ])

    const allEvents = [...familyEvents, ...holidays, ...specialEvents]
    if (!allEvents.length) {
      timer.end()
      return []
    }

    // 1 batch fetch of all assignments + member color
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

    const assignmentMap = assignments.reduce<Record<string, any[]>>((map, a) => {
      (map[a.event_id] ||= []).push(a)
      return map
    }, {})

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

// … rest of your optimizedQueries.ts (fetchOptimizedHolidays, specialEvents, cache, etc.) …