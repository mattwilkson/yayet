import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid, parseISO } from 'date-fns'

// Helper to strip composite UUID back to its “parent” UUID
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
  // basic fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')

  // assignments
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper] = useState('')

  // status
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // recurrence
  const [showRecurringOptions, setShowRecurringOptions] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count'|'date'>('count')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  // additional
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime] = useState('')
  const [driveTime, setDriveTime] = useState('')

  // editing/recurrence flags
  const [isEditing, setIsEditing] = useState(false)
  const [isRecurringParent, setIsRecurringParent] = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode] = useState<'single'|'all'>('single')

  // initialize when modal opens
  useEffect(() => {
    if (!isOpen) return

    // basic
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // start/end
    let sd = event.start_time ? new Date(event.start_time) : new Date()
    let ed = event.end_time ? new Date(event.end_time) : addHours(sd, 1)

    setStartDate(format(sd, 'yyyy-MM-dd'))
    setStartTime(format(sd, 'HH:mm'))
    setEndDate(format(ed, 'yyyy-MM-dd'))
    setEndTime(format(ed, 'HH:mm'))

    // editing flags
    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    // assignments
    const assigns = event.event_assignments || []
    setAssignedMembers(assigns.filter((a:any)=>!a.is_driver_helper).map((a:any)=>a.family_member_id))
    const driver = assigns.find((a:any)=>a.is_driver_helper)
    setDriverHelper(driver?.family_member_id||'')

    // recurrence parse
    setShowRecurringOptions(false)
    setRecurrenceType('none')
    setRecurrenceInterval(1)
    setRecurrenceEndType('count')
    setRecurrenceEndCount(10)
    setRecurrenceEndDate(format(addHours(sd, 24*30), 'yyyy-MM-dd'))
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
      } catch {} 
    }

    // additional reset
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // QoL #1: when startDate changes, keep endDate in sync
  useEffect(() => {
    setEndDate(startDate)
  }, [startDate])

  // QoL #2: when startTime changes, auto bump endTime one hour later
  useEffect(() => {
    const dt = parseISO(`${startDate}T${startTime}`)
    if (isValid(dt)) {
      const bumped = addHours(dt, 1)
      setEndTime(format(bumped, 'HH:mm'))
    }
  }, [startTime, startDate])

  // QoL #3: if user manually sets an endTime that's earlier than start, assume PM
  useEffect(() => {
    const sd = parseISO(`${startDate}T${startTime}`)
    const ed = parseISO(`${endDate}T${endTime}`)
    if (isValid(sd) && isValid(ed) && ed < sd) {
      // add 12 hours
      const corrected = addHours(ed, 12)
      setEndTime(format(corrected, 'HH:mm'))
    }
  }, [endTime, endDate, startDate, startTime])

  // handlers
  const toggleRecurringOptions = () => setShowRecurringOptions(x=>!x)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(x=>!x)
  const handleDayToggle = (d:string) =>
    setSelectedDays(xs => xs.includes(d) ? xs.filter(x=>x!==d) : [...xs, d])

  // ... create/update/delete omitted for brevity (same as before) ...

  return {
    isOpen, onClose,
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
    loading, error,
    showRecurringOptions, toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays, handleDayToggle,
    showAdditionalOptions, toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,
    isEditing, isRecurringParent, isRecurringInstance,
    editMode, setEditMode
    // plus your createEventAssignments, updateEventAssignments,
    // handleSave, handleDelete, plus helpers for lists
  }
}