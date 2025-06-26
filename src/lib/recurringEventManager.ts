import { supabase } from './supabase'
import { generateRecurringEventInstances, parseRecurrenceRule } from './recurrence'
import { startOfWeek, endOfWeek, addDays } from 'date-fns'

interface RecurringEventManager {
  // Get events for a date range (includes recurring instances)
  getEventsForDateRange: (familyId: string, startDate: Date, endDate: Date) => Promise<any[]>
  
  // Create a new recurring event
  createRecurringEvent: (eventData: any, recurrenceRule: any, assignedMembers: string[], driverHelper?: string) => Promise<{ success: boolean; error?: string; parentEvent?: any }>
  
  // Edit a single instance of a recurring event
  editRecurringInstance: (parentEventId: string, instanceDate: string, changes: any, assignedMembers?: string[], driverHelper?: string) => Promise<{ success: boolean; error?: string }>
  
  // Edit all future instances of a recurring event
  editRecurringSeries: (parentEventId: string, changes: any, assignedMembers?: string[], driverHelper?: string) => Promise<{ success: boolean; error?: string }>
  
  // Delete a single instance of a recurring event
  deleteRecurringInstance: (parentEventId: string, instanceDate: string) => Promise<{ success: boolean; error?: string }>
  
  // Delete entire recurring series
  deleteRecurringSeries: (parentEventId: string) => Promise<{ success: boolean; error?: string }>
}

// Helper function to extract pure UUID from composite ID
function extractParentEventId(eventId: string): string {
  // If the ID contains a date suffix (UUID-YYYY-MM-DD), extract just the UUID part
  const parts = eventId.split('-')
  if (parts.length >= 6) {
    // Standard UUID has 5 parts (8-4-4-4-12), if more parts exist, it's likely a composite ID
    return parts.slice(0, 5).join('-')
  }
  return eventId
}

// Helper function to create event assignments
async function createEventAssignments(eventId: string, assignedMembers: string[], driverHelper?: string) {
  if (!eventId || eventId === 'undefined') {
    throw new Error('Invalid event ID for creating assignments')
  }

  // Create regular assignments
  if (assignedMembers.length > 0) {
    const assignments = assignedMembers.map(memberId => ({
      event_id: eventId,
      family_member_id: memberId,
      is_driver_helper: false
    }))

    const { error: assignmentError } = await supabase
      .from('event_assignments')
      .insert(assignments)

    if (assignmentError) throw assignmentError
  }

  // Create driver/helper assignment if selected
  if (driverHelper) {
    const { error: driverError } = await supabase
      .from('event_assignments')
      .insert({
        event_id: eventId,
        family_member_id: driverHelper,
        is_driver_helper: true
      })

    if (driverError) throw driverError
  }
}

// Helper function to update event assignments
async function updateEventAssignments(eventId: string, assignedMembers: string[], driverHelper?: string) {
  // Delete existing assignments
  await supabase.from('event_assignments').delete().eq('event_id', eventId)
  
  // Create new assignments
  await createEventAssignments(eventId, assignedMembers, driverHelper)
}

// Helper function to create additional events (drive time, arrival)
async function createAdditionalEvents(
  mainEvent: any,
  time_to_be_there?: string,
  drive_time_minutes?: string,
  driverHelper?: string
) {
  try {
    console.log('Creating additional events for:', {
      eventId: mainEvent.id,
      title: mainEvent.title,
      time_to_be_there,
      drive_time_minutes,
      hasDriverHelper: !!driverHelper,
      isRecurringInstance: mainEvent.is_recurring_instance,
      parentEventId: mainEvent.parent_event_id,
      recurrenceInstanceDate: mainEvent.recurrence_instance_date
    })
    
    const startDate = new Date(mainEvent.start_time).toISOString().split('T')[0]
    const startDateTime = new Date(mainEvent.start_time)
    
    // Determine the correct parent_event_id and recurrence_instance_date for additional events
    let parentEventId: string
    let recurrenceInstanceDate: string | null = null
    
    if (mainEvent.parent_event_id) {
      // This is already an exception or child event, use its parent
      parentEventId = mainEvent.parent_event_id
      recurrenceInstanceDate = mainEvent.recurrence_instance_date || null
    } else if (mainEvent.id && mainEvent.id.includes('-') && mainEvent.id.split('-').length > 5) {
      // This is a virtual recurring instance with composite ID (UUID-date)
      parentEventId = extractParentEventId(mainEvent.id)
      recurrenceInstanceDate = mainEvent.recurrence_instance_date || startDate
    } else {
      // This is a regular event or parent recurring event
      parentEventId = mainEvent.id
      recurrenceInstanceDate = null
    }
    
    console.log('Determined parent/instance info:', {
      parentEventId,
      recurrenceInstanceDate,
      startDate
    })
    
    // Check if additional events already exist for this instance
    let existingArrivalEvent = null
    let existingDriveEvent = null
    
    if (recurrenceInstanceDate) {
      // For recurring instances, check by parent_event_id and recurrence_instance_date
      const { data: existingEvents } = await supabase
        .from('events')
        .select('id, title')
        .eq('parent_event_id', parentEventId)
        .eq('recurrence_instance_date', recurrenceInstanceDate)
        .or(`title.like.%${mainEvent.title} - Arrival%,title.like.%🚗 ${mainEvent.title}%`)
      
      if (existingEvents && existingEvents.length > 0) {
        existingArrivalEvent = existingEvents.find(e => e.title.includes('- Arrival'))
        existingDriveEvent = existingEvents.find(e => e.title.includes('🚗'))
      }
    } else {
      // For regular events, check by parent_event_id only
      const { data: existingEvents } = await supabase
        .from('events')
        .select('id, title')
        .eq('parent_event_id', parentEventId)
        .or(`title.like.%${mainEvent.title} - Arrival%,title.like.%🚗 ${mainEvent.title}%`)
      
      if (existingEvents && existingEvents.length > 0) {
        existingArrivalEvent = existingEvents.find(e => e.title.includes('- Arrival'))
        existingDriveEvent = existingEvents.find(e => e.title.includes('🚗'))
      }
    }
    
    // Create arrival time event if specified
    if (time_to_be_there) {
      const arrivalDateTime = new Date(`${startDate}T${time_to_be_there}`)
      
      // Only create arrival event if the time is different from the main event start time
      if (arrivalDateTime.toISOString() !== startDateTime.toISOString()) {
        // If arrival event already exists, skip creation
        if (existingArrivalEvent) {
          console.log('Arrival event already exists:', existingArrivalEvent.id)
        } else {
          const arrivalEventData = {
            title: `${mainEvent.title} - Arrival`,
            description: `Arrival time for ${mainEvent.title}`,
            start_time: arrivalDateTime.toISOString(),
            end_time: startDateTime.toISOString(),
            all_day: false,
            location: mainEvent.location || null,
            family_id: mainEvent.family_id,
            created_by_user_id: mainEvent.created_by_user_id,
            parent_event_id: parentEventId, // Use pure UUID
            recurrence_instance_date: recurrenceInstanceDate,
            is_exception: recurrenceInstanceDate ? true : false,
            is_deleted: false // CRITICAL FIX: Ensure new events are not marked as deleted
          }
          
          console.log('Creating arrival event:', arrivalEventData)
          
          const { data: arrivalEvent, error: arrivalError } = await supabase
            .from('events')
            .insert(arrivalEventData)
            .select()
            .single()
          
          if (arrivalError) throw arrivalError
          
          console.log('Arrival event created:', arrivalEvent.id)
          
          // Copy the same assignments to the arrival event
          if (mainEvent.event_assignments) {
            const regularAssignments = mainEvent.event_assignments
              .filter((a: any) => !a.is_driver_helper)
              .map((a: any) => a.family_member_id)
            
            await createEventAssignments(
              arrivalEvent.id, 
              regularAssignments, 
              driverHelper
            )
          }
        }
      }
    }
    
    // Create drive time event if specified and a driver is assigned
    if (drive_time_minutes && driverHelper) {
      const driveMinutes = parseInt(drive_time_minutes)
      
      if (!isNaN(driveMinutes) && driveMinutes > 0) {
        // If drive event already exists, skip creation
        if (existingDriveEvent) {
          console.log('Drive time event already exists:', existingDriveEvent.id)
        } else {
          // If arrival time is specified, use that as the end time for drive
          // Otherwise use the main event start time
          let driveEndTime
          if (time_to_be_there) {
            driveEndTime = new Date(`${startDate}T${time_to_be_there}`)
          } else {
            driveEndTime = new Date(startDateTime)
          }
          
          // Calculate drive start time by subtracting drive minutes
          const driveStartTime = new Date(driveEndTime)
          driveStartTime.setMinutes(driveStartTime.getMinutes() - driveMinutes)
          
          const driveEventData = {
            title: `🚗 ${mainEvent.title}`,
            description: `Drive time to ${mainEvent.title}`,
            start_time: driveStartTime.toISOString(),
            end_time: driveEndTime.toISOString(),
            all_day: false,
            location: mainEvent.location || null,
            family_id: mainEvent.family_id,
            created_by_user_id: mainEvent.created_by_user_id,
            parent_event_id: parentEventId, // Use pure UUID
            recurrence_instance_date: recurrenceInstanceDate,
            is_exception: recurrenceInstanceDate ? true : false,
            is_deleted: false // CRITICAL FIX: Ensure new events are not marked as deleted
          }
          
          console.log('Creating drive time event:', driveEventData)
          
          const { data: driveEvent, error: driveError } = await supabase
            .from('events')
            .insert(driveEventData)
            .select()
            .single()
          
          if (driveError) throw driveError
          
          console.log('Drive time event created:', driveEvent.id)
          
          // For drive time event, only assign the driver
          await createEventAssignments(driveEvent.id, [], driverHelper)
        }
      }
    }
    
    return true
  } catch (error) {
    console.error('Error creating additional events:', error)
    throw error
  }
}

export const recurringEventManager: RecurringEventManager = {
  async getEventsForDateRange(familyId: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      console.log('Fetching events for date range:', {
        familyId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
      
      // Get all events (both regular and recurring parents) for the family
      const { data: allEvents, error } = await supabase
        .from('events')
        .select(`
          *,
          event_assignments (
            family_member_id,
            is_driver_helper,
            family_members (*)
          )
        `)
        .eq('family_id', familyId)
        .eq('is_deleted', false) // CRITICAL FIX: Filter out soft-deleted events
        .or(`and(start_time.gte.${startDate.toISOString()},start_time.lte.${endDate.toISOString()}),is_recurring_parent.eq.true`)

      if (error) throw error

      const result: any[] = []

      for (const event of allEvents || []) {
        if (event.is_recurring_parent && event.recurrence_rule) {
          // This is a recurring parent - generate instances for the date range
          const recurrenceRule = parseRecurrenceRule(event.recurrence_rule)
          if (recurrenceRule) {
            console.log('Generating instances for recurring parent:', {
              eventId: event.id,
              title: event.title,
              hasAdditionalSettings: !!recurrenceRule.additionalSettings
            })
            
            const instances = generateRecurringEventInstances(
              event,
              recurrenceRule,
              startDate,
              endDate
            )
            
            // Check for any exceptions (modified instances) in the database
            const { data: exceptions } = await supabase
              .from('events')
              .select(`
                *,
                event_assignments (
                  family_member_id,
                  is_driver_helper,
                  family_members (*)
                )
              `)
              .eq('parent_event_id', event.id)
              .eq('is_deleted', false) // CRITICAL FIX: Filter out soft-deleted exceptions
              .gte('recurrence_instance_date', startDate.toISOString().split('T')[0])
              .lte('recurrence_instance_date', endDate.toISOString().split('T')[0])

            // Get list of deleted instance dates (marked with 'DELETED' title)
            const deletedInstanceDates = new Set(
              exceptions?.filter(ex => ex.title === 'DELETED')
                .map(ex => ex.recurrence_instance_date) || []
            )

            // Replace generated instances with exceptions where they exist
            // For generated instances, inherit assignments from parent
            const finalInstances = instances
              .filter(instance => {
                // FILTER OUT instances that have been marked as deleted
                return !deletedInstanceDates.has(instance.recurrence_instance_date)
              })
              .map(instance => {
                const exception = exceptions?.find(ex => 
                  ex.recurrence_instance_date === instance.recurrence_instance_date &&
                  ex.title !== 'DELETED' // Exclude deleted markers
                )
                
                if (exception) {
                  return exception
                } else {
                  // Inherit event_assignments from parent for color coding
                  return {
                    ...instance,
                    event_assignments: event.event_assignments // Inherit parent's assignments
                  }
                }
              })

            result.push(...finalInstances)
            
            // Process additional events (drive time, arrival) for each instance
            if (recurrenceRule.additionalSettings) {
              const { time_to_be_there, drive_time_minutes } = recurrenceRule.additionalSettings
              
              if (time_to_be_there || drive_time_minutes) {
                console.log('Processing additional events for recurring instances:', {
                  parentId: event.id,
                  instanceCount: finalInstances.length,
                  time_to_be_there,
                  drive_time_minutes
                })
                
                // Find driver helper from parent event assignments
                let driverHelper = null
                if (event.event_assignments) {
                  const driverAssignment = event.event_assignments.find(
                    (a: any) => a.is_driver_helper
                  )
                  if (driverAssignment) {
                    driverHelper = driverAssignment.family_member_id
                  }
                }
                
                // For each instance, check if additional events exist or create them
                for (const instance of finalInstances) {
                  // Skip exceptions as they should already have their additional events
                  if (instance.is_exception) continue
                  
                  // For virtual instances, check if additional events exist
                  const parentId = event.id
                  const instanceDate = instance.recurrence_instance_date
                  
                  // Check if additional events already exist for this instance
                  const { data: existingAdditionalEvents } = await supabase
                    .from('events')
                    .select('id, title')
                    .eq('parent_event_id', parentId)
                    .eq('recurrence_instance_date', instanceDate)
                    .eq('is_deleted', false) // CRITICAL FIX: Filter out soft-deleted additional events
                    .or(`title.like.%${event.title} - Arrival%,title.like.%🚗 ${event.title}%`)
                  
                  // If no additional events exist, create them
                  if (!existingAdditionalEvents || existingAdditionalEvents.length === 0) {
                    console.log('Creating additional events for instance:', {
                      instanceDate,
                      title: instance.title,
                      hasTimeToBeThere: !!time_to_be_there,
                      hasDriveTime: !!drive_time_minutes,
                      hasDriverHelper: !!driverHelper
                    })
                    
                    try {
                      await createAdditionalEvents(
                        instance,
                        time_to_be_there,
                        drive_time_minutes,
                        driverHelper
                      )
                    } catch (error) {
                      console.error('Error creating additional events for instance:', error)
                      // Continue with other instances even if one fails
                    }
                  } else {
                    console.log('Additional events already exist for instance:', {
                      instanceDate,
                      existingCount: existingAdditionalEvents.length
                    })
                  }
                }
              }
            }
          }
        } else if (!event.is_recurring_parent && event.title !== 'DELETED') {
          // Regular event or recurring instance - include as-is, but exclude DELETED markers
          result.push(event)
        }
      }

      return result
    } catch (error) {
      console.error('Error fetching events for date range:', error)
      return []
    }
  },

  async createRecurringEvent(eventData: any, recurrenceRule: any, assignedMembers: string[], driverHelper?: string): Promise<{ success: boolean; error?: string; parentEvent?: any }> {
    try {
      // Store additional event settings for recurring instances
      const additionalSettings = {
        time_to_be_there: eventData.time_to_be_there || null,
        drive_time_minutes: eventData.drive_time_minutes || null
      }
      
      // Remove these properties from the eventData before creating the event
      const { time_to_be_there, drive_time_minutes, ...cleanEventData } = eventData
      
      // Create the parent recurring event
      const { data: parentEvent, error: createError } = await supabase
        .from('events')
        .insert({
          ...cleanEventData,
          is_recurring_parent: true,
          is_deleted: false, // CRITICAL FIX: Ensure new events are not marked as deleted
          recurrence_rule: JSON.stringify({
            ...recurrenceRule,
            additionalSettings // Store these settings in the recurrence rule
          })
        })
        .select()
        .single()

      if (createError) throw createError

      // Create assignments for the parent event (which instances will inherit)
      await createEventAssignments(parentEvent.id, assignedMembers, driverHelper)
      
      // Create additional events (drive time, arrival) for the parent event
      if (additionalSettings.time_to_be_there || (additionalSettings.drive_time_minutes && driverHelper)) {
        await createAdditionalEvents(
          parentEvent,
          additionalSettings.time_to_be_there,
          additionalSettings.drive_time_minutes,
          driverHelper
        )
      }

      return { success: true, parentEvent }
    } catch (error: any) {
      console.error('Error creating recurring event:', error)
      return { success: false, error: error.message }
    }
  },

  async editRecurringInstance(parentEventId: string, instanceDate: string, changes: any, assignedMembers?: string[], driverHelper?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract the pure UUID from parentEventId if it's a composite ID
      const pureParentEventId = extractParentEventId(parentEventId)
      
      // Extract additional settings from changes
      const additionalSettings = {
        time_to_be_there: changes.time_to_be_there || null,
        drive_time_minutes: changes.drive_time_minutes || null
      }
      
      // Remove these properties from changes before updating the event
      const { time_to_be_there, drive_time_minutes, ...cleanChanges } = changes
      
      // Check if an exception already exists for this date
      const { data: existingException, error: queryError } = await supabase
        .from('events')
        .select('id')
        .eq('parent_event_id', pureParentEventId)
        .eq('recurrence_instance_date', instanceDate)
        .eq('is_deleted', false) // CRITICAL FIX: Filter out soft-deleted exceptions
        .neq('title', 'DELETED') // Exclude deleted markers
        .maybeSingle()

      if (queryError) throw queryError

      let exceptionId: string

      if (existingException) {
        // Update existing exception
        const { error: updateError } = await supabase
          .from('events')
          .update(cleanChanges)
          .eq('id', existingException.id)

        if (updateError) throw updateError
        exceptionId = existingException.id
        
        // Delete any existing additional events for this exception
        const { data: existingAdditionalEvents } = await supabase
          .from('events')
          .select('id')
          .eq('parent_event_id', pureParentEventId)
          .eq('recurrence_instance_date', instanceDate)
          .neq('id', existingException.id) // Don't delete the main exception
          
        if (existingAdditionalEvents && existingAdditionalEvents.length > 0) {
          const additionalEventIds = existingAdditionalEvents.map(e => e.id)
          await supabase
            .from('events')
            .delete()
            .in('id', additionalEventIds)
        }
      } else {
        // Get parent event details to populate required fields
        const { data: parentEvent, error: parentError } = await supabase
          .from('events')
          .select('family_id, created_by_user_id, recurrence_rule')
          .eq('id', pureParentEventId)
          .single()

        if (parentError) throw parentError

        if (!parentEvent) {
          throw new Error('Parent event not found')
        }
        
        // Create new exception
        const { data: newException, error: createError } = await supabase
          .from('events')
          .insert({
            ...cleanChanges,
            parent_event_id: pureParentEventId,
            recurrence_instance_date: instanceDate,
            is_exception: true,
            is_deleted: false, // CRITICAL FIX: Ensure new exceptions are not marked as deleted
            family_id: parentEvent.family_id,
            created_by_user_id: parentEvent.created_by_user_id
          })
          .select()
          .single()

        if (createError) throw createError
        exceptionId = newException.id
      }

      // Update assignments for the exception if provided
      if (assignedMembers !== undefined) {
        await updateEventAssignments(exceptionId, assignedMembers, driverHelper)
      }
      
      // Create additional events (drive time, arrival) for this exception
      if (additionalSettings.time_to_be_there || (additionalSettings.drive_time_minutes && driverHelper)) {
        // Get the updated exception
        const { data: exception } = await supabase
          .from('events')
          .select('*')
          .eq('id', exceptionId)
          .single()
          
        if (exception) {
          await createAdditionalEvents(
            exception,
            additionalSettings.time_to_be_there,
            additionalSettings.drive_time_minutes,
            driverHelper
          )
        }
      }

      return { success: true }
    } catch (error: any) {
      console.error('Error editing recurring instance:', error)
      return { success: false, error: error.message }
    }
  },

  async editRecurringSeries(parentEventId: string, changes: any, assignedMembers?: string[], driverHelper?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Editing recurring series with parent ID:', parentEventId)
      
      // Extract the pure UUID from parentEventId if it's a composite ID
      const pureParentEventId = extractParentEventId(parentEventId)
      
      // Extract additional scheduling settings from changes
      const additionalSettings = {
        time_to_be_there: changes.time_to_be_there || null,
        drive_time_minutes: changes.drive_time_minutes || null
      }
      
      // Remove these properties from the changes object before updating the event
      const { time_to_be_there, drive_time_minutes, ...eventChanges } = changes
      
      // Get the current recurrence rule
      const { data: parentEvent, error: getError } = await supabase
        .from('events')
        .select('recurrence_rule')
        .eq('id', pureParentEventId)
        .single()
        
      if (getError) throw getError
      
      // Parse and update the recurrence rule with additional settings
      let recurrenceRule = {}
      if (parentEvent.recurrence_rule) {
        try {
          recurrenceRule = JSON.parse(parentEvent.recurrence_rule)
          // Update additionalSettings while preserving the rest of the rule
          recurrenceRule = {
            ...recurrenceRule,
            additionalSettings
          }
        } catch (e) {
          console.error('Error parsing recurrence rule:', e)
          // If parsing fails, create a new rule with just additionalSettings
          recurrenceRule = { additionalSettings }
        }
      } else {
        // No existing rule, create a new one with just additionalSettings
        recurrenceRule = { additionalSettings }
      }
      
      // Update the parent event with the modified recurrence rule
      const { error: updateError } = await supabase
        .from('events')
        .update({
          ...eventChanges,
          recurrence_rule: JSON.stringify(recurrenceRule)
        })
        .eq('id', pureParentEventId)
        .eq('is_recurring_parent', true)

      if (updateError) throw updateError

      // Update assignments for the parent (which future instances will inherit)
      if (assignedMembers !== undefined) {
        await updateEventAssignments(pureParentEventId, assignedMembers, driverHelper)
        
        // Also update assignments for any existing exceptions that don't have custom assignments
        const { data: exceptions } = await supabase
          .from('events')
          .select('id')
          .eq('parent_event_id', pureParentEventId)
          .eq('is_exception', true)
          .eq('is_deleted', false) // CRITICAL FIX: Filter out soft-deleted exceptions
          .neq('title', 'DELETED') // Exclude deleted markers

        if (exceptions) {
          for (const exception of exceptions) {
            // Check if this exception has custom assignments
            const { data: existingAssignments } = await supabase
              .from('event_assignments')
              .select('id')
              .eq('event_id', exception.id)
              .limit(1)

            // If no custom assignments, inherit from parent
            if (!existingAssignments || existingAssignments.length === 0) {
              await createEventAssignments(exception.id, assignedMembers, driverHelper)
            }
          }
        }
      }
      
      // Handle additional events for the parent
      if (additionalSettings.time_to_be_there || (additionalSettings.drive_time_minutes && driverHelper)) {
        // First, delete any existing additional events for the parent
        const { data: existingAdditionalEvents } = await supabase
          .from('events')
          .select('id')
          .eq('parent_event_id', pureParentEventId)
          .or(`title.like.%${eventChanges.title} - Arrival%,title.like.%🚗 ${eventChanges.title}%`)
          
        if (existingAdditionalEvents && existingAdditionalEvents.length > 0) {
          const additionalEventIds = existingAdditionalEvents.map(e => e.id)
          await supabase
            .from('events')
            .delete()
            .in('id', additionalEventIds)
        }
        
        // Get the updated parent event
        const { data: updatedParent } = await supabase
          .from('events')
          .select('*')
          .eq('id', pureParentEventId)
          .single()
          
        if (updatedParent) {
          // Then create new additional events
          await createAdditionalEvents(
            updatedParent,
            additionalSettings.time_to_be_there,
            additionalSettings.drive_time_minutes,
            driverHelper
          )
        }
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('Error editing recurring series:', error)
      return { success: false, error: error.message }
    }
  },

  async deleteRecurringInstance(parentEventId: string, instanceDate: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Fetch the parent event to get necessary details like family_id and created_by_user_id
      const { data: parentEvent, error: fetchParentError } = await supabase
        .from('events')
        .select('family_id, created_by_user_id, start_time, end_time') // Select relevant fields
        .eq('id', parentEventId)
        .single();

      if (fetchParentError) {
        throw new Error(`Failed to fetch parent event: ${fetchParentError.message}`);
      }
      if (!parentEvent) {
        throw new Error('Parent event not found.');
      }

      // Check if an exception already exists for this instance
      const { data: existingException, error: fetchError } = await supabase
        .from('events')
        .select('id')
        .eq('parent_event_id', parentEventId)
        .eq('recurrence_instance_date', instanceDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }

      if (existingException) {
        // If an exception exists, UPDATE it to mark as deleted (soft delete)
        const { error: updateError } = await supabase
          .from('events')
          .update({ is_deleted: true }) // Mark as deleted
          .eq('id', existingException.id);
        if (updateError) throw updateError;

        // Also soft-delete any additional events linked to this exception
        const { error: updateAdditionalError } = await supabase
          .from('events')
          .update({ is_deleted: true }) // Mark as deleted
          .eq('parent_event_id', existingException.id);
        if (updateAdditionalError) throw updateAdditionalError;

      } else {
        // If no exception exists, create one to mark this instance as deleted (soft delete)
        const { error: insertError } = await supabase
          .from('events')
          .insert({
            parent_event_id: parentEventId,
            recurrence_instance_date: instanceDate,
            is_exception: true,
            is_deleted: true, // Mark as deleted
            // Copy relevant fields from parent for data integrity and RLS
            title: `DELETED: ${parentEvent.title}`, // More informative title
            start_time: parentEvent.start_time, // Use parent's start/end time as placeholder
            end_time: parentEvent.end_time,
            family_id: parentEvent.family_id, // Crucial for RLS
            created_by_user_id: parentEvent.created_by_user_id // Crucial for RLS
          });
        if (insertError) throw insertError;
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting recurring instance:', error)
      return { success: false, error: error.message }
    }
  },

  async deleteRecurringSeries(parentEventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract the pure UUID from parentEventId if it's a composite ID
      const pureParentEventId = extractParentEventId(parentEventId)
      
      // Validate parentEventId
      if (!pureParentEventId || pureParentEventId.trim() === '') {
        throw new Error('Invalid parent event ID')
      }
      
      // Delete all additional events for all instances
      const { data: instances } = await supabase
        .from('events')
        .select('id, recurrence_instance_date')
        .eq('parent_event_id', pureParentEventId)
        
      if (instances && instances.length > 0) {
        for (const instance of instances) {
          // Delete additional events for this instance
          const { data: additionalEvents } = await supabase
            .from('events')
            .select('id')
            .eq('parent_event_id', pureParentEventId)
            .eq('recurrence_instance_date', instance.recurrence_instance_date)
            .neq('id', instance.id) // Don't delete the instance itself yet
            
          if (additionalEvents && additionalEvents.length > 0) {
            const additionalEventIds = additionalEvents.map(e => e.id)
            await supabase
              .from('events')
              .delete()
              .in('id', additionalEventIds)
          }
        }
      }
      
      // Delete additional events for the parent
      const { data: parentAdditionalEvents } = await supabase
        .from('events')
        .select('id')
        .eq('parent_event_id', pureParentEventId)
        
      if (parentAdditionalEvents && parentAdditionalEvents.length > 0) {
        const additionalEventIds = parentAdditionalEvents.map(e => e.id)
        await supabase
          .from('events')
          .delete()
          .in('id', additionalEventIds)
      }

      // Delete all instances first (due to foreign key constraints)
      await supabase
        .from('events')
        .delete()
        .eq('parent_event_id', pureParentEventId)
      
      // Delete the parent event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', pureParentEventId)
        .eq('is_recurring_parent', true)

      if (error) throw error

      return { success: true }
    } catch (error: any) {
      console.error('Error deleting recurring series:', error)
      return { success: false, error: error.message }
    }
  }
}