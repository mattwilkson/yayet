// File: src/lib/optimizedQueries.ts
// … keep all your imports and helpers above …

export async function fetchOptimizedEvents(
  familyId: string,
  currentDate: Date,
  viewMode: 'full' | 'personal' = 'full',
  userId?: string
) {
  const t = performanceMonitor.startTimer('fetchOptimizedEvents')

  // 1) load recurring + exceptions
  const { recurringEventManager } = await import('./recurringEventManager')
  const weekStart  = startOfWeek(currentDate)
  const rangeStart = subWeeks(weekStart, 2)
  const rangeEnd   = addWeeks(weekStart, 4)
  let events = await recurringEventManager.getEventsForDateRange(familyId, rangeStart, rangeEnd)

  // 2) personal filter…
  // (your existing code here)

  // 3) holidays + specials
  const [hols, specs] = await Promise.all([
    fetchOptimizedHolidays(rangeStart, rangeEnd),
    fetchOptimizedSpecialEvents(familyId, rangeStart, rangeEnd)
  ])
  events = [...events, ...hols, ...specs]

  // —— NEW: only real events (valid UUIDs) get assignments fetched ——
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const realEventIds = Array.from(new Set(
    events
      .map(e => extractParentEventId(e.id))
      .filter(id => uuidRegex.test(id))
  ))

  // 4) batch fetch assignments for real events
  let assigns: any[] = []
  if (realEventIds.length) {
    const { data, error } = await supabase
      .from('event_assignments')
      .select('event_id,is_driver_helper,family_member_id,family_members(id,color)')
      .in('event_id', realEventIds)
    if (error) throw error
    assigns = data
  }

  // 5) group and reattach
  const groups: Record<string, typeof assigns> = {}
  assigns.forEach(a => {
    const pid = a.event_id
    groups[pid] ||= []
    groups[pid].push(a)
  })

  const out = events.map(e => {
    const pid = extractParentEventId(e.id)
    const evAs = groups[pid] || []
    const primary = evAs.find(a => !a.is_driver_helper)?.family_members
    return { ...e, event_assignments: evAs, color: primary?.color ?? '#888' }
  })

  t.end()
  return out
}