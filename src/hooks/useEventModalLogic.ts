import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, parseISO, isValid } from 'date-fns'

// Helper function to extract pure UUID from composite ID
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  if (parts.length >= 6) {
    // Standard UUID has 5 parts (8-4-4-4-12), if more parts exist, it's likely a composite ID
    return parts.slice(0, 5).join('-')
  }
  return eventId
}

export interface UseEventModalLogicProps {
  isOpen: boolean
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
  onClose: () => void
  onSave: () => void
}

export function useEventModalLogic({
  isOpen, 
  event, 
  familyMembers, 
  familyId, 
  userId, 
  onClose, 
  onSave
}: UseEventModalLogicProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRecurringOptions, setShowRecurringOptions] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [recurrenceEndType, setRecurrenceEndType] = useState('count')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime] = useState('')
  const [driveTime, setDriveTime] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode] = useState<'single' | 'all'>('single')
  const [isRecurringParent, setIsRecurringParent] = useState(false)

  const getInitialDateTime = () => {
    console.log('📅 EventModal.getInitialDateTime called with event:', event)
    
    if (event?.start_time && event?.end_time) {
      const startDateTime = new Date(event.start_time)
      const endDateTime = new Date(event.end_time)
      
      console.log('📅 EventModal: Using event data for initial times:', {
        eventId: event.id,
        startTime: event.start_time,
        endTime: event.end_time,
        parsedStart: startDateTime.toISOString(),
        parsedEnd: endDateTime.toISOString(),
      })
      
      return { startDateTime, endDateTime }
    }
    
    // Fallback to current time
    const now = new Date()
    const startDateTime = new Date(now)
    startDateTime.setHours(9, 0, 0, 0)
    const endDateTime = new Date(now)
    endDateTime.setHours(10, 0, 0, 0)
    
    return { startDateTime, endDateTime }
  }

  useEffect(() => {
    if (isOpen && event) {
      console.log('🔄 EventModal initializing with event:', event)
      
      // Set basic event details
      setTitle(event.title || '')
      setDescription(event.description || '')
      setLocation(event.location || '')
      setAllDay(event.all_day || false)
      
      // Handle dates and times
      const { startDateTime, endDateTime } = getInitialDateTime()
      
      setStartDate(format(startDateTime, 'yyyy-MM-dd'))
      setStartTime(format(startDateTime, 'HH:mm'))
      setEndDate(format(endDateTime, 'yyyy-MM-dd'))
      setEndTime(format(endDateTime, 'HH:mm'))
      
      // Check if this is an existing event (editing)
      setIsEditing(!!event.id)
      
      // Check if this is a recurring event
      setIsRecurringParent(!!event.is_recurring_parent)
      setIsRecurringInstance(!!event.parent_event_id)
      
      // Reset edit mode
      setEditMode('single')
      
      // Reset recurrence options
      setShowRecurringOptions(false)
      setRecurrenceType('none')
      setRecurrenceInterval(1)
      setRecurrenceEndDate(format(addHours(endDateTime, 24 * 30), 'yyyy-MM-dd')) // Default to 30 days
      setRecurrenceEndCount(10)
      setRecurrenceEndType('count')
      setSelectedDays([])
      
      // Reset additional options
      setShowAdditionalOptions(false)
      setArrivalTime('')
      setDriveTime('')
      
      // Get assigned members if editing
      if (event.id && event.event_assignments) {
        const memberIds = event.event_assignments
          .filter((assignment: any) => !assignment.is_driver_helper)
          .map((assignment: any) => assignment.family_member_id)
        
        setAssignedMembers(memberIds)
        
        // Get driver/helper if assigned
        const driverAssignment = event.event_assignments.find(
          (assignment: any) => assignment.is_driver_helper
        )
        
        setDriverHelper(driverAssignment ? driverAssignment.family_member_id : '')
      } else {
        setAssignedMembers([])
        setDriverHelper('')
      }
      
      // Parse recurrence rule if editing a recurring event
      if (event.recurrence_rule) {
        try {
          const recurrenceRule = JSON.parse(event.recurrence_rule)
          console.log('📅 Parsed recurrence rule:', recurrenceRule)
          
          setRecurrenceType(recurrenceRule.type || 'none')
          setRecurrenceInterval(recurrenceRule.interval || 1)
          
          if (recurrenceRule.days && Array.isArray(recurrenceRule.days)) {
            console.log('📅 Setting selected days from rule:', recurrenceRule.days)
            setSelectedDays(recurrenceRule.days)
          } else if (recurrenceRule.type === 'weekly' || recurrenceRule.type === 'daily') {
            // Default to the day of the week of the event
            const dayOfWeek = format(startDateTime, 'EEEE').toLowerCase()
            console.log('📅 Setting default day of week:', dayOfWeek)
            setSelectedDays([dayOfWeek])
          }
          
          if (recurrenceRule.endDate) {
            setRecurrenceEndType('date')
            setRecurrenceEndDate(recurrenceRule.endDate)
          } else if (recurrenceRule.endCount) {
            setRecurrenceEndType('count')
            setRecurrenceEndCount(recurrenceRule.endCount)
          }
          
          setShowRecurringOptions(true)
        } catch (error) {
          console.error('Error parsing recurrence rule:', error)
        }
      }
    }
  }, [isOpen, event])

  // Set default selected day when recurrence type changes to weekly or daily
  useEffect(() => {
    if ((recurrenceType === 'weekly') && selectedDays.length === 0) {
      // Default to the day of the week of the event start date
      try {
        const startDay = new Date(`${startDate}T${startTime || '00:00'}`)
        if (isValid(startDay)) {
          const dayOfWeek = format(startDay, 'EEEE').toLowerCase()
          console.log('📅 Setting default day of week for recurrence:', dayOfWeek)
          setSelectedDays([dayOfWeek])
        }
      } catch (error) {
        console.error('Error setting default day of week:', error)
      }
    }
  }, [recurrenceType, startDate, startTime, selectedDays])

  const createAdditionalEvents = async (mainEvent: any, startDateTime: Date, endDateTime: Date) => {
    try {
      // Create arrival time event if specified
      if (arrivalTime) {
        const arrivalDateTime = new Date(`${startDate}T${arrivalTime}`)
        
        // Only create arrival event if the time is different from the main event start time
        if (isValid(arrivalDateTime) && arrivalDateTime.toISOString() !== startDateTime.toISOString()) {
          const arrivalEventData = {
            title: `${mainEvent.title} - Arrival`,
            description: `Arrival time for ${mainEvent.title}`,
            start_time: arrivalDateTime.toISOString(),
            end_time: startDateTime.toISOString(),
            all_day: false,
            location: location || null,
            family_id: familyId,
            created_by_user_id: userId
          }
          
          const { data: arrivalEvent, error: arrivalError } = await supabase
            .from('events')
            .insert(arrivalEventData)
            .select()
            .single()
          
          if (arrivalError) throw arrivalError
          
          // Copy the same assignments to the arrival event
          await createEventAssignments(arrivalEvent.id, assignedMembers, driverHelper)
        }
      }
      
      // Create drive time event if specified and a driver is assigned
      if (driveTime && driverHelper) {
        const driveMinutes = parseInt(driveTime)
        
        if (!isNaN(driveMinutes) && driveMinutes > 0) {
          // If arrival time is specified, use that as the end time for drive
          // Otherwise use the main event start time
          let driveEndTime
          if (arrivalTime) {
            driveEndTime = new Date(`${startDate}T${arrivalTime}`)
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
            location: location || null,
            family_id: familyId,
            created_by_user_id: userId
          }
          
          const { data: driveEvent, error: driveError } = await supabase
            .from('events')
            .insert(driveEventData)
            .select()
            .single()
          
          if (driveError) throw driveError
          
          // For drive time event, only assign the driver
          await createEventAssignments(driveEvent.id, [], driverHelper)
        }
      }
    } catch (error) {
      console.error('Error creating additional events:', error)
      throw error
    }
  }

  const createEventAssignments = async (eventId: string, memberIds: string[], driverHelperId?: string) => {
    try {
      // Create regular assignments
      if (memberIds.length > 0) {
        const assignments = memberIds.map(memberId => ({
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
      if (driverHelperId) {
        const { error: driverError } = await supabase
          .from('event_assignments')
          .insert({
            event_id: eventId,
            family_member_id: driverHelperId,
            is_driver_helper: true
          })
        
        if (driverError) throw driverError
      }
    } catch (error) {
      console.error('Error creating event assignments:', error)
      throw error
    }
  }

  const updateEventAssignments = async (eventId: string, memberIds: string[], driverHelperId?: string) => {
    try {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('event_assignments')
        .delete()
        .eq('event_id', eventId)
      
      if (deleteError) throw deleteError
      
      // Create new assignments
      await createEventAssignments(eventId, memberIds, driverHelperId)
    } catch (error) {
      console.error('Error updating event assignments:', error)
      throw error
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Validate required fields
      if (!title.trim()) {
        setError('Title is required')
        setLoading(false)
        return
      }
      
      // Validate dates and times
      const startDateTime = new Date(`${startDate}T${startTime}`)
      const endDateTime = new Date(`${endDate}T${endTime}`)
      
      if (!isValid(startDateTime) || !isValid(endDateTime)) {
        setError('Invalid date or time')
        setLoading(false)
        return
      }
      
      if (endDateTime < startDateTime) {
        setError('End time must be after start time')
        setLoading(false)
        return
      }
      
      // Validate recurrence options
      if (recurrenceType !== 'none') {
        // For weekly recurrence with specific days, ensure days are selected
        if (recurrenceType === 'weekly' && selectedDays.length === 0) {
          setError('Please select at least one day of the week for recurrence')
          setLoading(false)
          return
        }
      }
      
      // Prepare event data
      const eventData = {
        title,
        description: description || null,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: allDay,
        location: location || null,
        family_id: familyId,
        created_by_user_id: userId
      }
      
      // Prepare recurrence rule if applicable
      let recurrenceRule = null
      if (recurrenceType !== 'none' && !isRecurringInstance) {
        recurrenceRule = {
          type: recurrenceType,
          interval: recurrenceInterval
        }
        
        // Add selected days for weekly recurrence
        if (recurrenceType === 'weekly' && selectedDays.length > 0) {
          recurrenceRule.days = selectedDays
        }
        
        // Add end condition
        if (recurrenceEndType === 'date') {
          recurrenceRule.endDate = recurrenceEndDate
        } else {
          recurrenceRule.endCount = recurrenceEndCount
        }
      }
      
      console.log('📅 Saving event with recurrence rule:', recurrenceRule)
      
      // Handle recurring event logic
      if (isEditing) {
        const actualEventId = extractParentEventId(event.id)
        
        if (isRecurringParent && editMode === 'all') {
          // Update the entire recurring series
          const { error: updateError } = await supabase
            .from('events')
            .update({
              ...eventData,
              recurrence_rule: recurrenceRule ? JSON.stringify(recurrenceRule) : null
            })
            .eq('id', actualEventId)
          
          if (updateError) throw updateError
          
          // Update assignments for the parent event
          await updateEventAssignments(actualEventId, assignedMembers, driverHelper)
        } else if (isRecurringInstance && editMode === 'single') {
          // Update just this instance (create an exception)
          const instanceDate = event.recurrence_instance_date
          
          // Check if an exception already exists
          const { data: existingException, error: checkError } = await supabase
            .from('events')
            .select('id')
            .eq('parent_event_id', event.parent_event_id)
            .eq('recurrence_instance_date', instanceDate)
            .maybeSingle()
          
          if (checkError) throw checkError
          
          if (existingException) {
            // Update existing exception
            const { error: updateError } = await supabase
              .from('events')
              .update(eventData)
              .eq('id', existingException.id)
            
            if (updateError) throw updateError
            
            // Update assignments for this exception
            await updateEventAssignments(existingException.id, assignedMembers, driverHelper)
          } else {
            // Create new exception
            const { data: newException, error: createError } = await supabase
              .from('events')
              .insert({
                ...eventData,
                parent_event_id: event.parent_event_id,
                recurrence_instance_date: instanceDate,
                is_exception: true
              })
              .select()
              .single()
            
            if (createError) throw createError
            
            // Create assignments for this exception
            await createEventAssignments(newException.id, assignedMembers, driverHelper)
          }
        } else {
          // Regular event update (non-recurring or single instance)
          const { error: updateError } = await supabase
            .from('events')
            .update(eventData)
            .eq('id', actualEventId)
          
          if (updateError) throw updateError
          
          // Update assignments
          await updateEventAssignments(actualEventId, assignedMembers, driverHelper)
        }
      } else {
        // Creating a new event
        if (recurrenceType !== 'none') {
          // Create a recurring event
          const { data: recurringEvent, error: createError } = await supabase
            .from('events')
            .insert({
              ...eventData,
              recurrence_rule: JSON.stringify(recurrenceRule),
              is_recurring_parent: true
            })
            .select()
            .single()
          
          if (createError) throw createError
          
          // Create assignments for the recurring event
          await createEventAssignments(recurringEvent.id, assignedMembers, driverHelper)
          
          // Handle additional scheduling tools if enabled
          if (showAdditionalOptions) {
            await createAdditionalEvents(recurringEvent, startDateTime, endDateTime)
          }
        } else {
          // Create a regular event
          const { data: newEvent, error: createError } = await supabase
            .from('events')
            .insert(eventData)
            .select()
            .single()
          
          if (createError) throw createError
          
          // Create assignments
          await createEventAssignments(newEvent.id, assignedMembers, driverHelper)
          
          // Handle additional scheduling tools if enabled
          if (showAdditionalOptions) {
            await createAdditionalEvents(newEvent, startDateTime, endDateTime)
          }
        }
      }
      
      onSave()
    } catch (error: any) {
      console.error('Error saving event:', error)
      setError(error.message || 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return
    
    try {
      setLoading(true)
      setError('')
      
      const actualEventId = extractParentEventId(event.id)
      
      if (isRecurringParent && editMode === 'all') {
        // Delete entire recurring series
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', actualEventId)
        
        if (error) throw error
      } else if (isRecurringInstance && editMode === 'single') {
        // Delete just this instance (create a deletion marker)
        const instanceDate = event.recurrence_instance_date
        
        // Check if we have a valid instance date
        if (!instanceDate) {
          setError('Cannot delete this recurring instance: missing instance date information')
          setLoading(false)
          return
        }
        
        // Check if an exception already exists for this date
        const { data: existingException, error: checkError } = await supabase
          .from('events')
          .select('id')
          .eq('parent_event_id', event.parent_event_id)
          .eq('recurrence_instance_date', instanceDate)
          .maybeSingle()
        
        if (checkError) throw checkError
        
        if (existingException) {
          // Delete existing exception
          const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('id', existingException.id)
          
          if (deleteError) throw deleteError
        }
        
        // Create a "deleted" marker
        const { error: createError } = await supabase
          .from('events')
          .insert({
            title: 'DELETED', // Special marker for deleted instances
            description: 'This instance has been deleted',
            start_time: new Date(event.start_time).toISOString(),
            end_time: new Date(event.end_time).toISOString(),
            all_day: false,
            family_id: familyId,
            created_by_user_id: userId,
            parent_event_id: event.parent_event_id,
            recurrence_instance_date: instanceDate,
            is_exception: true
          })
        
        if (createError) throw createError
      } else {
        // Regular event deletion
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', actualEventId)
        
        if (error) throw error
      }
      
      onSave()
    } catch (error: any) {
      console.error('Error deleting event:', error)
      setError(error.message || 'Failed to delete event')
    } finally {
      setLoading(false)
    }
  }

  const toggleRecurringOptions = () => {
    setShowRecurringOptions(!showRecurringOptions)
    
    // Reset recurrence options when hiding
    if (showRecurringOptions) {
      setRecurrenceType('none')
      setRecurrenceInterval(1)
      setRecurrenceEndDate(format(addHours(new Date(), 24 * 30), 'yyyy-MM-dd'))
      setRecurrenceEndCount(10)
      setRecurrenceEndType('count')
      setSelectedDays([])
    }
  }

  const toggleAdditionalOptions = () => {
    setShowAdditionalOptions(!showAdditionalOptions)
    
    // Reset additional options when hiding
    if (showAdditionalOptions) {
      setArrivalTime('')
      setDriveTime('')
    }
  }

  const handleDayToggle = (day: string) => {
    console.log('🔄 Toggling day:', day, 'Current selected days:', selectedDays)
    
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
      setSelectedDays([...selectedDays, day])
    }
  }

  // Filter family members for assignment - only immediate family
  const assignableFamilyMembers = familyMembers.filter(member => 
    member.category === 'immediate_family'
  )

  // Filter family members for driver/helper role
  // Rules: Immediate family members who are above the age of 16, 
  // if birthdays are not provided assume Mother and Father are above the age of 16.
  // Include all Extended Family Members and Caregivers regardless of age
  const driverHelperFamilyMembers = familyMembers.filter(member => {
    // Include all extended family and caregivers
    if (member.category === 'extended_family' || member.category === 'caregiver') {
      return true
    }
    
    // For immediate family, check age if birthday is available
    if (member.category === 'immediate_family') {
      // If no birthday, assume Mother and Father are above 16
      if (!member.birthday) {
        return member.relationship === 'Mother' || member.relationship === 'Father'
      }
      
      // If birthday is available, check if they're above 16
      try {
        // Handle both MM/DD/YYYY and MM/DD formats
        let birthYear
        const parts = member.birthday.split('/')
        
        if (parts.length === 3) {
          // MM/DD/YYYY format
          birthYear = parseInt(parts[2])
        } else {
          // For MM/DD format, we can't determine age
          return member.relationship === 'Mother' || member.relationship === 'Father'
        }
        
        const currentYear = new Date().getFullYear()
        return (currentYear - birthYear) >= 16
      } catch (error) {
        // If there's an error parsing the birthday, default to Mother/Father
        return member.relationship === 'Mother' || member.relationship === 'Father'
      }
    }
    
    return false
  })

  const getDisplayName = (member: any) => {
    return member.nickname && member.nickname.trim() ? member.nickname : member.name
  }

  // Get day name from index (0 = Sunday, 1 = Monday, etc.)
  const getDayName = (index: number): string => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    return days[index]
  }

  // Get day letter from day name
  const getDayLetter = (day: string): string => {
    const dayMap: Record<string, string> = {
      'sunday': 'S',
      'monday': 'M',
      'tuesday': 'T',
      'wednesday': 'W',
      'thursday': 'T',
      'friday': 'F',
      'saturday': 'S'
    }
    return dayMap[day] || day.charAt(0).toUpperCase()
  }

  // Get day display name (capitalized)
  const getDayDisplayName = (day: string): string => {
    return day.charAt(0).toUpperCase() + day.slice(1)
  }

  // Get selected days summary text
  const getSelectedDaysSummary = (): string => {
    if (selectedDays.length === 0) return 'No days selected'
    
    // Sort days in week order (Sunday to Saturday)
    const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const sortedDays = [...selectedDays].sort((a, b) => 
      dayOrder.indexOf(a) - dayOrder.indexOf(b)
    )
    
    return sortedDays.map(day => getDayDisplayName(day)).join(', ')
  }

  return {
    // State
    title, setTitle,
    description, setDescription,
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate,
    endTime, setEndTime,
    allDay, setAllDay,
    location, setLocation,
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,
    loading,
    error,
    showRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays,
    showAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,
    isEditing,
    isRecurringInstance,
    editMode, setEditMode,
    isRecurringParent,
    
    // Computed values
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    
    // Handlers
    handleSave,
    handleDelete,
    toggleRecurringOptions,
    toggleAdditionalOptions,
    handleDayToggle,
    
    // Utility functions
    getDisplayName,
    getDayName,
    getDayLetter,
    getDayDisplayName,
    getSelectedDaysSummary
  }
}