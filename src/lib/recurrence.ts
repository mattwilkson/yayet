import { addDays, addWeeks, addMonths, addYears, format, isBefore, isAfter } from 'date-fns'

interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  days?: string[]
  endDate?: string
  endCount?: number
  additionalSettings?: {
    time_to_be_there?: string
    drive_time_minutes?: string
  }
}

const dayNameToNumber: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

// NEW: Generate recurring event instances on-demand (not stored in DB)
export function generateRecurringEventInstances(
  parentEvent: any,
  recurrenceRule: RecurrenceRule,
  startDate: Date,
  endDate: Date,
  maxEvents: number = 100
): any[] {
  const instances: any[] = []
  const eventStartDate = new Date(parentEvent.start_time)
  const eventEndDate = new Date(parentEvent.end_time)
  const eventDuration = eventEndDate.getTime() - eventStartDate.getTime()
  
  let currentDate = new Date(Math.max(eventStartDate.getTime(), startDate.getTime()))
  let count = 0
  
  // Set end condition
  const hasEndDate = recurrenceRule.endDate
  const endDateLimit = hasEndDate ? new Date(recurrenceRule.endDate!) : endDate
  const hasEndCount = recurrenceRule.endCount
  const endCountLimit = hasEndCount ? recurrenceRule.endCount! : maxEvents
  
  while (count < endCountLimit && count < maxEvents && currentDate <= endDate) {
    // Check if we've passed the end date
    if (endDateLimit && isAfter(currentDate, endDateLimit)) {
      break
    }
    
    // For daily and weekly recurrence with specific days
    if ((recurrenceRule.type === 'daily' || recurrenceRule.type === 'weekly') && recurrenceRule.days && recurrenceRule.days.length > 0) {
      const currentDayOfWeek = currentDate.getDay()
      const currentDayName = Object.keys(dayNameToNumber).find(
        day => dayNameToNumber[day] === currentDayOfWeek
      )
      
      if (currentDayName && recurrenceRule.days.includes(currentDayName)) {
        // This day matches our recurrence pattern
        const instanceStartTime = new Date(currentDate)
        instanceStartTime.setHours(eventStartDate.getHours(), eventStartDate.getMinutes(), 0, 0)
        const instanceEndTime = new Date(instanceStartTime.getTime() + eventDuration)
        
        instances.push({
          ...parentEvent,
          id: `${parentEvent.id}-${format(instanceStartTime, 'yyyy-MM-dd')}`, // Virtual ID
          start_time: instanceStartTime.toISOString(),
          end_time: instanceEndTime.toISOString(),
          parent_event_id: parentEvent.id,
          recurrence_instance_date: format(instanceStartTime, 'yyyy-MM-dd'),
          is_recurring_instance: true,
          is_recurring_parent: false, // CRITICAL FIX: Virtual instances are NOT parents
          recurrence_rule: null, // Instances don't have recurrence rules
        })
        
        count++
      }
      
      // Move to next day for daily, or next occurrence for weekly
      if (recurrenceRule.type === 'daily') {
        currentDate = addDays(currentDate, recurrenceRule.interval)
      } else {
        // For weekly, we need to check all days in the current week first
        currentDate = addDays(currentDate, 1)
        
        // If we've completed a week and haven't found all days, skip to next interval
        if (currentDate.getDay() === 0) { // Sunday (start of week)
          if (recurrenceRule.interval > 1) {
            currentDate = addWeeks(currentDate, recurrenceRule.interval - 1)
          }
        }
      }
    } else {
      // Standard recurrence without specific days
      const instanceStartTime = new Date(currentDate)
      instanceStartTime.setHours(eventStartDate.getHours(), eventStartDate.getMinutes(), 0, 0)
      const instanceEndTime = new Date(instanceStartTime.getTime() + eventDuration)
      
      instances.push({
        ...parentEvent,
        id: `${parentEvent.id}-${format(instanceStartTime, 'yyyy-MM-dd')}`, // Virtual ID
        start_time: instanceStartTime.toISOString(),
        end_time: instanceEndTime.toISOString(),
        parent_event_id: parentEvent.id,
        recurrence_instance_date: format(instanceStartTime, 'yyyy-MM-dd'),
        is_recurring_instance: true,
        is_recurring_parent: false, // CRITICAL FIX: Virtual instances are NOT parents
        recurrence_rule: null, // Instances don't have recurrence rules
      })
      
      count++
      
      // Move to next occurrence
      switch (recurrenceRule.type) {
        case 'daily':
          currentDate = addDays(currentDate, recurrenceRule.interval)
          break
        case 'weekly':
          currentDate = addWeeks(currentDate, recurrenceRule.interval)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, recurrenceRule.interval)
          break
        case 'yearly':
          currentDate = addYears(currentDate, recurrenceRule.interval)
          break
      }
    }
    
    // Safety check to prevent infinite loops
    if (count > maxEvents) {
      console.warn('Reached maximum event limit for recurrence generation')
      break
    }
  }
  
  return instances
}

// LEGACY: Keep for backward compatibility (used during event creation)
function generateRecurringEvents(
  baseEvent: any,
  recurrenceRule: RecurrenceRule,
  maxEvents: number = 100
): any[] {
  const events: any[] = []
  const startDate = new Date(baseEvent.start_time)
  const endDate = new Date(baseEvent.end_time)
  const eventDuration = endDate.getTime() - startDate.getTime()
  
  let currentDate = new Date(startDate)
  let count = 0
  
  // Set end condition
  const hasEndDate = recurrenceRule.endDate
  const endDateLimit = hasEndDate ? new Date(recurrenceRule.endDate!) : null
  const hasEndCount = recurrenceRule.endCount
  const endCountLimit = hasEndCount ? recurrenceRule.endCount! : maxEvents
  
  while (count < endCountLimit && count < maxEvents) {
    // Check if we've passed the end date
    if (endDateLimit && isAfter(currentDate, endDateLimit)) {
      break
    }
    
    // For daily and weekly recurrence with specific days
    if ((recurrenceRule.type === 'daily' || recurrenceRule.type === 'weekly') && recurrenceRule.days && recurrenceRule.days.length > 0) {
      const currentDayOfWeek = currentDate.getDay()
      const currentDayName = Object.keys(dayNameToNumber).find(
        day => dayNameToNumber[day] === currentDayOfWeek
      )
      
      if (currentDayName && recurrenceRule.days.includes(currentDayName)) {
        // This day matches our recurrence pattern
        const eventStartTime = new Date(currentDate)
        const eventEndTime = new Date(eventStartTime.getTime() + eventDuration)
        
        events.push({
          ...baseEvent,
          id: undefined, // Will be generated by database
          start_time: eventStartTime.toISOString(),
          end_time: eventEndTime.toISOString(),
          recurrence_rule: null, // Individual instances don't need recurrence rules
          title: `${baseEvent.title}`, // Keep original title
        })
        
        count++
      }
      
      // Move to next day for daily, or next occurrence for weekly
      if (recurrenceRule.type === 'daily') {
        currentDate = addDays(currentDate, recurrenceRule.interval)
      } else {
        // For weekly, we need to check all days in the current week first
        currentDate = addDays(currentDate, 1)
        
        // If we've completed a week and haven't found all days, skip to next interval
        if (currentDate.getDay() === 0) { // Sunday (start of week)
          if (recurrenceRule.interval > 1) {
            currentDate = addWeeks(currentDate, recurrenceRule.interval - 1)
          }
        }
      }
    } else {
      // Standard recurrence without specific days
      const eventStartTime = new Date(currentDate)
      const eventEndTime = new Date(eventStartTime.getTime() + eventDuration)
      
      events.push({
        ...baseEvent,
        id: undefined,
        start_time: eventStartTime.toISOString(),
        end_time: eventEndTime.toISOString(),
        recurrence_rule: null,
        title: `${baseEvent.title}`,
      })
      
      count++
      
      // Move to next occurrence
      switch (recurrenceRule.type) {
        case 'daily':
          currentDate = addDays(currentDate, recurrenceRule.interval)
          break
        case 'weekly':
          currentDate = addWeeks(currentDate, recurrenceRule.interval)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, recurrenceRule.interval)
          break
        case 'yearly':
          currentDate = addYears(currentDate, recurrenceRule.interval)
          break
      }
    }
    
    // Safety check to prevent infinite loops
    if (count > maxEvents) {
      console.warn('Reached maximum event limit for recurrence generation')
      break
    }
  }
  
  return events
}

export function parseRecurrenceRule(ruleString: string): RecurrenceRule | null {
  try {
    return JSON.parse(ruleString)
  } catch {
    return null
  }
}

// NEW: Helper function to check if an event is a recurring instance
function isRecurringInstance(event: any): boolean {
  return !!(event.parent_event_id || event.is_recurring_instance)
}

// NEW: Helper function to check if an event is a recurring parent
function isRecurringParent(event: any): boolean {
  return !!(event.is_recurring_parent && event.recurrence_rule)
}

// NEW: Get the parent event ID for a recurring instance
function getParentEventId(event: any): string | null {
  return event.parent_event_id || (event.is_recurring_parent ? event.id : null)
}