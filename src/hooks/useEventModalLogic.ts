// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid } from 'date-fns'

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
  // state variables
  const [title, setTitle]                     = useState('')
  const [description, setDescription]         = useState('')
  const [startDate, setStartDate]             = useState('')
  const [startTime, setStartTime]             = useState('')
  const [endDate, setEndDate]                 = useState('')
  const [endTime, setEndTime]                 = useState('')
  const [allDay, setAllDay]                   = useState(false)
  const [location, setLocation]               = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper]       = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')

  const [showRecurringOptions, setShowRecurringOptions] = useState(false)
  const [recurrenceType, setRecurrenceType]             = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval]     = useState(1)
  const [recurrenceEndType, setRecurrenceEndType]       = useState<'count'|'date'>('count')
  const [recurrenceEndCount, setRecurrenceEndCount]     = useState(10)
  const [recurrenceEndDate, setRecurrenceEndDate]       = useState('')
  const [selectedDays, setSelectedDays]                 = useState<string[]>([])

  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime]                     = useState('')
  const [driveTime, setDriveTime]                         = useState('')

  const [isEditing, setIsEditing]                     = useState(false)
  const [isRecurringParent, setIsRecurringParent]     = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode]                       = useState<'single'|'all'>('single')

  // initialize when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return

    // basic fields
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // dates
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

    // editing / recurrence flags
    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    // assignments
    const assigns = event.event_assignments || []
    setAssignedMembers(assigns.filter((a:any)=>!a.is_driver_helper).map((a:any)=>a.family_member_id))
    const driver = assigns.find((a:any)=>a.is_driver_helper)
    setDriverHelper(driver?.family_member_id || '')

    // reset & parse recurrence
    setShowRecurringOptions(false)
    setRecurrenceType('none')
    setRecurrenceInterval(1)
    setRecurrenceEndType('count')
    setRecurrenceEndCount(10)
    setRecurrenceEndDate(format(addHours(ed, 24*30), 'yyyy-MM-dd'))
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

    // reset additional
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // default day for weekly
  useEffect(() => {
    if (recurrenceType==='weekly' && selectedDays.length===0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-us',{ weekday:'long' }).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType, startDate, startTime])

  // ——— QoL #1 & #2 & #3 ———
  useEffect(() => {
    if (!startTime) return

    const [h, m] = startTime.split(':').map(Number)
    const base = new Date(`${startDate}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)

    const bumped = new Date(base)
    bumped.setHours(bumped.getHours() + 1)

    // QoL #3: if wrapping past noon
    if (bumped.getHours() <= h && h < 12) {
      bumped.setHours(bumped.getHours() + 12)
    }

    setEndDate(format(bumped, 'yyyy-MM-dd'))
    setEndTime(format(bumped, 'HH:mm'))
  }, [startDate, startTime])

  // handlers
  const toggleRecurringOptions  = () => setShowRecurringOptions(x => !x)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(x => !x)
  const handleDayToggle         = (d: string) =>
    setSelectedDays(xs => xs.includes(d) ? xs.filter(x=>x!==d) : [...xs,d])

  //... create/update/delete logic unchanged ...

  return {
    isOpen,
    onClose,
    handleSave,
    handleDelete,
    loading,
    error,
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
    showRecurringOptions,
    toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays, handleDayToggle,
    showAdditionalOptions,
    toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,
    isEditing,
    isRecurringParent,
    isRecurringInstance,
    editMode, setEditMode,
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  }
}