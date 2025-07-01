import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid, parse } from 'date-fns'

// Helper to strip composite UUID back to its "parent" UUID
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5 ? parts.slice(0, 5).join('-') : eventId
}

export interface UseEventModalLogicProps {
  isOpen: boolean
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

export function useEventModalLogic({
  isOpen,
  event,
  familyMembers,
  familyId,
  userId,
  onClose,
  onSave,
  onDelete
}: UseEventModalLogicProps) {
  // Initialize with valid default date/time values
  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setHours(9, 0, 0, 0)
  const defaultEnd = addHours(defaultStart, 1)

  // state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState(format(defaultStart, 'HH:mm'))
  const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'))
  const [endTime, setEndTime] = useState(format(defaultEnd, 'HH:mm'))
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showRecurringOptions, setShowRecurringOptions] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count' | 'date'>('count')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime] = useState('')
  const [driveTime, setDriveTime] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [isRecurringParent, setIsRecurringParent] = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode] = useState<'single' | 'all'>('single')

  // initialize when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return

    console.log('🔄 useEventModalLogic initializing with event:', event)

    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // parse dates
    let sd = new Date(), ed = new Date()
    if (event.start_time && event.end_time) {
      try {
        sd = new Date(event.start_time)
        ed = new Date(event.end_time)
        
        if (!isValid(sd) || !isValid(ed)) {
          console.warn('Invalid date detected in event:', { 
            start: event.start_time, 
            end: event.end_time,
            isStartValid: isValid(sd),
            isEndValid: isValid(ed)
          })
          
          // Fall back to defaults
          sd = defaultStart
          ed = defaultEnd
        }
      } catch (error) {
        console.error('Error parsing event dates:', error)
        // Fall back to defaults
        sd = defaultStart
        ed = defaultEnd
      }
    } else {
      sd = defaultStart
      ed = defaultEnd
    }
    
    setStartDate(format(sd, 'yyyy-MM-dd'))
    setStartTime(format(sd, 'HH:mm'))
    setEndDate(format(ed, 'yyyy-MM-dd'))
    setEndTime(format(ed, 'HH:mm'))

    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    // assignments
    const assigns = event.event_assignments || []
    setAssignedMembers(
      assigns.filter((a: any) => !a.is_driver_helper).map((a: any) => a.family_member_id)
    )
    const driver = assigns.find((a: any) => a.is_driver_helper)
    setDriverHelper(driver?.family_member_id || '')

    // recurrence rule reset and parse
    setShowRecurringOptions(false)
    setRecurrenceType('none')
    setRecurrenceInterval(1)
    setRecurrenceEndType('count')
    setRecurrenceEndCount(10)
    setRecurrenceEndDate(format(addHours(ed, 30 * 24), 'yyyy-MM-dd'))
    setSelectedDays([])
    if (event.recurrence_rule) {
      try {
        const r = JSON.parse(event.recurrence_rule)
        setRecurrenceType(r.type || 'none')
        setRecurrenceInterval(r.interval || 1)
        if (r.days) setSelectedDays(r.days)
        if (r.endDate) {
          setRecurrenceEndType('date')
          setRecurrenceEndDate(r.endDate)
        } else if (r.endCount) {
          setRecurrenceEndType('count')
          setRecurrenceEndCount(r.endCount)
        }
        setShowRecurringOptions(true)
      } catch (error) {
        console.error('Error parsing recurrence rule:', error)
      }
    }

    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // QoL #3: auto-bump end date/time into PM if needed
  useEffect(() => {
    if (!startDate || !startTime) return

    setEndDate(startDate)
    try {
      const parsed = parse(startTime, 'HH:mm', new Date())
      if (!isValid(parsed)) return
      let bumped = addHours(parsed, 1)

      const startHour = parsed.getHours()
      if (startHour < 12 && bumped.getHours() < startHour) {
        bumped = addHours(parsed, 13)
      }

      setEndTime(format(bumped, 'HH:mm'))
    } catch (error) {
      console.error('Error updating end time based on start time:', error)
    }
  }, [startDate, startTime])

  // QoL #3: if user picks endTime <= start on morning start, bump +12h
  useEffect(() => {
    if (!startTime || !endTime) return
    try {
      const ps = parse(startTime, 'HH:mm', new Date())
      const pe = parse(endTime, 'HH:mm', new Date())
      if (!isValid(ps) || !isValid(pe)) return
      const sh = ps.getHours(), eh = pe.getHours()
      if (sh < 12 && eh <= sh) {
        setEndTime(format(addHours(pe, 12), 'HH:mm'))
      }
    } catch (error) {
      console.error('Error adjusting end time:', error)
    }
  }, [startTime, endTime])

  // weekly default day
  useEffect(() => {
    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      try {
        const dt = new Date(`${startDate}T${startTime}`)
        if (isValid(dt)) {
          const dow = dt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
          setSelectedDays([dow])
        }
      } catch (error) {
        console.error('Error setting default day for weekly recurrence:', error)
      }
    }
  }, [recurrenceType, startDate, startTime])

  // create/update assignments helpers…
  async function createEventAssignments(eid: string, members: string[], driver?: string) {
    if (members.length) {
      const payload = members.map(id => ({ event_id: eid, family_member_id: id, is_driver_helper: false }))
      const { error } = await supabase.from('event_assignments').insert(payload)
      if (error) throw error
    }
    if (driver) {
      const { error } = await supabase.from('event_assignments')
        .insert({ event_id: eid, family_member_id: driver, is_driver_helper: true })
      if (error) throw error
    }
  }
  async function updateEventAssignments(eid: string, members: string[], driver?: string) {
    const { error: delErr } = await supabase.from('event_assignments').delete().eq('event_id', eid)
    if (delErr) throw delErr
    await createEventAssignments(eid, members, driver)
  }

  // ─────────────── SAVE & DELETE ───────────────

const handleSave = async () => {
  setLoading(true)
  setError('')
  try {
    // …all your existing validation & supabase insert/update logic…
  } catch (err: any) {
    setError(err.message || 'Save failed')
  } finally {
    setLoading(false)
  }
}

const handleDelete = async () => {
  if (!window.confirm('Delete this event?')) return
  setLoading(true)
  setError('')
  try {
    // …all your existing delete logic…
  } catch (err: any) {
    setError(err.message || 'Delete failed')
  } finally {
    setLoading(false)
  }
}

  // save
  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      
      // Validate dates and times
      let sd: Date, ed: Date
      try {
        sd = new Date(`${startDate}T${startTime}`)
        ed = new Date(`${endDate}T${endTime}`)
        
        if (!isValid(sd) || !isValid(ed)) {
          throw new Error('Invalid date/time format')
        }
      } catch (error) {
        console.error('Date validation error:', error, { startDate, startTime, endDate, endTime })
        throw new Error('Invalid date or time')
      }
      
      if (ed < sd) throw new Error('End must be after start')
      if (recurrenceType === 'weekly' && selectedDays.length === 0) throw new Error('Select at least one day')

      const data: any = {
        title,
        description: description || null,
        start_time: sd.toISOString(),
        end_time: ed.toISOString(),
        all_day: allDay,
        location: location || null,
        family_id: familyId,
        created_by_user_id: userId
      }

      let rule: any = null
      if (recurrenceType !== 'none' && !isRecurringInstance) {
        rule = { type: recurrenceType, interval: recurrenceInterval }
        if (recurrenceType === 'weekly') rule.days = selectedDays
        if (recurrenceEndType === 'date') rule.endDate = recurrenceEndDate
        else rule.endCount = recurrenceEndCount
      }

      if (isEditing) {
        const pid = extractParentEventId(event.id)
        if (isRecurringParent && editMode === 'all') {
          await supabase.from('events')
            .update({ ...data, recurrence_rule: rule ? JSON.stringify(rule) : null })
            .eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        } else if (isRecurringInstance && editMode === 'single') {
          await supabase.from('events').update(data).eq('id', event.id)
          await updateEventAssignments(event.id, assignedMembers, driverHelper)
        } else {
          await supabase.from('events').update(data).eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        }
      } else {
        if (recurrenceType !== 'none') {
          const { data: parent, error } = await supabase.from('events')
            .insert({ ...data, recurrence_rule: JSON.stringify(rule), is_recurring_parent: true })
            .select().single()
          if (error) throw error
          await createEventAssignments(parent.id, assignedMembers, driverHelper)
        } else {
          const { data: single, error } = await supabase.from('events')
            .insert(data).select().single()
          if (error) throw error
          await createEventAssignments(single.id, assignedMembers, driverHelper)
        }
      }

      onSave()
    } catch (err: any) {
      console.error('Error saving event:', err)
      setError(err.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  // delete
  const handleDelete = async () => {
    if (!window.confirm('Delete this event?')) return
    setLoading(true)
    setError('')
    try {
      const pid = extractParentEventId(event.id)
      if (isRecurringParent && editMode === 'all') {
        await supabase.from('events').delete().eq('id', pid)
      } else if (isRecurringInstance && editMode === 'single') {
        await supabase.from('events').delete().eq('id', event.id)
      } else {
        await supabase.from('events').delete().eq('id', pid)
      }
      onDelete()
    } catch (err: any) {
      console.error('Error deleting event:', err)
      setError(err.message || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // Toggle functions
  const toggleRecurringOptions = () => {
    setShowRecurringOptions(!showRecurringOptions)
  }

  const toggleAdditionalOptions = () => {
    setShowAdditionalOptions(!showAdditionalOptions)
  }

  const handleDayToggle = (day: string) => {
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

  // Get selected days summary text
  const getSelectedDaysSummary = (): string => {
    if (selectedDays.length === 0) return 'No days selected'
    
    // Sort days in week order (Sunday to Saturday)
    const dayOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const sortedDays = [...selectedDays].sort((a, b) => 
      dayOrder.indexOf(a) - dayOrder.indexOf(b)
    )
    
    return sortedDays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')
  }

  return {
    isOpen,
    onClose,
    handleSave,
    handleDelete,
    loading,
    error,
    title,
    setTitle,
    description,
    setDescription,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    allDay,
    setAllDay,
    location,
    setLocation,
    assignedMembers,
    setAssignedMembers,
    driverHelper,
    setDriverHelper,
    showRecurringOptions,
    toggleRecurringOptions,
    recurrenceType,
    setRecurrenceType,
    recurrenceInterval,
    setRecurrenceInterval,
    recurrenceEndType,
    setRecurrenceEndType,
    recurrenceEndCount,
    setRecurrenceEndCount,
    recurrenceEndDate,
    setRecurrenceEndDate,
    selectedDays,
    handleDayToggle,
    showAdditionalOptions,
    toggleAdditionalOptions,
    arrivalTime,
    setArrivalTime,
    driveTime,
    setDriveTime,
    isEditing,
    isRecurringParent,
    isRecurringInstance,
    editMode,
    setEditMode,
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  }
}