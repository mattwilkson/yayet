import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Save, 
  X, 
  Trash2, 
  Repeat, 
  ChevronDown, 
  ChevronUp,
  Car,
  AlertCircle,
  Check
} from 'lucide-react'
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

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
}

export const EventModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  event, 
  familyMembers, 
  familyId, 
  userId 
}: EventModalProps) => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Create Event'}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Recurring Event Edit Mode */}
        {(isRecurringParent || isRecurringInstance) && isEditing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              This is a recurring event
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="editMode"
                  checked={editMode === 'single'}
                  onChange={() => setEditMode('single')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-blue-700">
                  Edit only this occurrence
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="editMode"
                  checked={editMode === 'all'}
                  onChange={() => setEditMode('all')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-blue-700">
                  Edit all occurrences
                </span>
              </label>
              <p className="text-xs text-blue-600 mt-1">
                Note: Editing all occurrences will affect future events in this series.
              </p>
            </div>
          </div>
        )}

        {/* Basic Event Details */}
        <div className="space-y-4">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter event title"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                disabled={allDay}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                disabled={allDay}
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">All day event</span>
            </label>
          </div>

          {/* Recurring Options - Moved here, below all day event and above additional scheduling */}
          {!isRecurringInstance && (
            <div>
              <button
                type="button"
                onClick={toggleRecurringOptions}
                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {showRecurringOptions ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                <Repeat className="h-4 w-4 mr-1" />
                Make this a recurring event
              </button>
              
              {showRecurringOptions && (
                <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Recurrence Pattern
                    </label>
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value)}
                      className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  
                  {recurrenceType !== 'none' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Repeat every
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={recurrenceInterval}
                            onChange={(e) => setRecurrenceInterval(parseInt(e.target.value))}
                            className="w-16 rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <span className="ml-2 text-sm text-blue-700">
                            {recurrenceType === 'daily' && 'day(s)'}
                            {recurrenceType === 'weekly' && 'week(s)'}
                            {recurrenceType === 'monthly' && 'month(s)'}
                            {recurrenceType === 'yearly' && 'year(s)'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Day selection for weekly recurrence */}
                      {recurrenceType === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-2">
                            Repeat on these days:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleDayToggle(day)}
                                className={`w-10 h-10 rounded-full text-sm font-medium flex items-center justify-center ${
                                  selectedDays.includes(day)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-700 border border-blue-300'
                                }`}
                              >
                                {selectedDays.includes(day) ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  getDayLetter(day)
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-blue-700">
                            {selectedDays.length > 0 ? (
                              <span>Selected: {getSelectedDaysSummary()}</span>
                            ) : (
                              <span className="text-red-500">Please select at least one day</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          End
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="recurrenceEnd"
                              checked={recurrenceEndType === 'count'}
                              onChange={() => setRecurrenceEndType('count')}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-blue-700">After</span>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={recurrenceEndCount}
                              onChange={(e) => setRecurrenceEndCount(parseInt(e.target.value))}
                              className="ml-2 w-16 rounded-lg border border-blue-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              disabled={recurrenceEndType !== 'count'}
                            />
                            <span className="ml-2 text-sm text-blue-700">occurrences</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="recurrenceEnd"
                              checked={recurrenceEndType === 'date'}
                              onChange={() => setRecurrenceEndType('date')}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-blue-700">On date</span>
                            <input
                              type="date"
                              value={recurrenceEndDate}
                              onChange={(e) => setRecurrenceEndDate(e.target.value)}
                              className="ml-2 rounded-lg border border-blue-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              disabled={recurrenceEndType !== 'date'}
                            />
                          </label>
                        </div>
                      </div>
                      
                      {/* Recurrence Summary */}
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">Recurrence Summary:</h4>
                        <p className="text-sm text-blue-700">
                          {recurrenceType === 'daily'
                            ? `Repeats every ${recurrenceInterval} day(s)`
                            : recurrenceType === 'weekly' 
                              ? `Repeats every ${recurrenceInterval} week(s) on ${getSelectedDaysSummary()}`
                              : recurrenceType === 'monthly' 
                                ? `Repeats every ${recurrenceInterval} month(s)`
                                : `Repeats every ${recurrenceInterval} year(s)`
                          }
                          
                          {recurrenceEndType === 'count' && `, ${recurrenceEndCount} times`}
                          {recurrenceEndType === 'date' && `, until ${recurrenceEndDate}`}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional Scheduling Tools */}
          <div>
            <button
              type="button"
              onClick={toggleAdditionalOptions}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {showAdditionalOptions ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              Additional Scheduling Tools
            </button>
            
            {showAdditionalOptions && (
              <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    What time do you need to be there?
                  </label>
                  <div className="flex items-center">
                    <input
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="ml-2 text-xs text-blue-600">
                      Creates an "Arrival" event before the main event
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    How long is the drive? (minutes)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={driveTime}
                      onChange={(e) => setDriveTime(e.target.value)}
                      className="rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-24"
                    />
                    <span className="ml-2 text-xs text-blue-600">
                      Creates a "Drive Time" event before arrival/start time
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded-lg">
                  <div className="flex items-center mb-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    <span className="font-medium">How this works:</span>
                  </div>
                  <p>
                    These options create additional events in your calendar to help with planning:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>
                      <strong>Arrival Time:</strong> Creates an event between your arrival time and the event start time
                    </li>
                    <li>
                      <strong>Drive Time:</strong> Creates a 🚗 event before arrival/start time based on drive duration
                    </li>
                  </ul>
                  <p className="mt-1">
                    All events will be linked and share the same assignments.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location (optional)"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Assigned Family Members */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Assign Family Members
          </h3>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {assignableFamilyMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No family members available</p>
              ) : (
                assignableFamilyMembers.map((member) => (
                  <label key={member.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={assignedMembers.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignedMembers([...assignedMembers, member.id])
                        } else {
                          setAssignedMembers(assignedMembers.filter(id => id !== member.id))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-2 flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className="text-sm text-gray-700">
                        {getDisplayName(member)}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Driver/Helper Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Car className="h-4 w-4 mr-2" />
            Who is driving/helping?
          </h3>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <select
              value={driverHelper}
              onChange={(e) => setDriverHelper(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Select driver/helper (optional)</option>
              {driverHelperFamilyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {getDisplayName(member)}
                </option>
              ))}
            </select>
            
            <p className="text-xs text-gray-500 mt-2">
              Eligible drivers/helpers: Immediate family members over 16, all extended family members, and caregivers.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {isEditing && (
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={loading}
              loading={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}