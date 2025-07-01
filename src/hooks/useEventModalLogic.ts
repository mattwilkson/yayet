import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid, parse } from 'date-fns'

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
  // state
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
  const [recurrenceType, setRecurrenceType] =
    useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none')
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

    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // parse dates
    let sd = new Date(), ed = new Date()
    if (event.start_time && event.end_time) {
      sd = new Date(event.start_time)
      ed = new Date(event.end_time)
    } else {
      sd.setHours(9, 0, 0, 0)
      ed = addHours(sd, 1)
    }
    setStartDate(format(sd, 'yyyy-MM-dd'))
    setStartTime(format(sd, 'HH:mm'))
    setEndDate(format(ed, 'yyyy-MM-dd'))
    setEndTime(format(ed, 'HH:mm'))

    // flags
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

    // recurrence rule
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
        if (r.endDate) setRecurrenceEndDate(r.endDate)
        if (r.endCount) setRecurrenceEndCount(r.endCount)
        setShowRecurringOptions(true)
      } catch {}
    }

    // additional options
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // weekly default day
  useEffect(() => {
    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType, startDate, startTime])

  // — QoL #3: auto-bump when start changes
  useEffect(() => {
    if (!startDate || !startTime) return
    setEndDate(startDate)
    const parsed = parse(startTime, 'HH:mm', new Date())
    if (!isValid(parsed)) return
    let bumped = addHours(parsed, 1)
    const startHour = parsed.getHours()
    if (startHour < 12 && bumped.getHours() < startHour) {
      bumped = addHours(parsed, 13)
    }
    setEndTime(format(bumped, 'HH:mm'))
  }, [startDate, startTime])

  // — QoL #3: manual bump
  useEffect(() => {
    if (!startTime || !endTime) return
    const ps = parse(startTime, 'HH:mm', new Date())
    const pe = parse(endTime,   'HH:mm', new Date())
    if (!isValid(ps) || !isValid(pe)) return
    if (ps.getHours() < 12 && pe.getHours() <= ps.getHours()) {
      setEndTime(format(addHours(pe, 12), 'HH:mm'))
    }
  }, [startTime, endTime])

  // save
  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      // your existing validation & upsert logic here
      onSave()
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  // ...delete + helpers stay unchanged...

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
    setRecurrenceType,
    recurrenceType,
    recurrenceInterval,
    setRecurrenceInterval,
    recurrenceEndType,
    setRecurrenceEndType,
    recurrenceEndCount,
    setRecurrenceEndCount,
    recurrenceEndDate,
    setRecurrenceEndDate,
    selectedDays,
    showAdditionalOptions,
    arrivalTime,
    driveTime,
    isEditing,
    isRecurringParent,
    isRecurringInstance,
    editMode
    // etc.
  }
}