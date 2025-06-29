// File: src/hooks/useEventModalLogic.ts
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
  isOpen, event, familyMembers,
  familyId, userId, onClose, onSave, onDelete
}: UseEventModalLogicProps) {
  // ----- state -----
  const [title, setTitle]                 = useState('')
  const [description, setDescription]     = useState('')
  const [startDate, setStartDate]         = useState('')
  const [startTime, setStartTime]         = useState('')
  const [endDate, setEndDate]             = useState('')
  const [endTime, setEndTime]             = useState('')
  const [allDay, setAllDay]               = useState(false)
  const [location, setLocation]           = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper]   = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

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

  // ----- initialize when modal opens or event changes -----
  useEffect(() => {
    if (!isOpen) return

    // basic fields
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day ?? false)
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

    const sdDate = format(sd, 'yyyy-MM-dd')
    const sdTime = format(sd, 'HH:mm')
    const edDate = format(ed, 'yyyy-MM-dd')
    const edTime = format(ed, 'HH:mm')

    setStartDate(sdDate)
    setStartTime(sdTime)
    setEndDate(edDate)
    setEndTime(edTime)

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

  // ----- QoL 1: keep endDate in sync with startDate -----
  useEffect(() => {
    if (startDate) {
      setEndDate(startDate)
    }
  }, [startDate])

  // ----- QoL 2: keep endTime = startTime + 1h ----- 
  useEffect(() => {
    if (!startTime) return

    // parse "HH:mm"
    const [h, m] = startTime.split(':').map(Number)
    const dt = new Date()
    dt.setHours(h, m, 0, 0)
    dt.setHours(dt.getHours() + 1)    // add one hour
    const newEnd = format(dt, 'HH:mm')
    setEndTime(newEnd)
  }, [startTime])

  // ----- (placeholder) QoL 3: “If event crosses noon, …” -----
  // useEffect(() => {
  //   // Please clarify what behavior you’d like here:
  //   // e.g. automatically switch endTime’s AM/PM, or bump endDate?
  // }, [startTime, endTime])

  // … keep the rest of your handlers / save / delete / computed lists …

  return {
    // modal control
    isOpen, onClose,
    // handlers
    handleSave, handleDelete,
    // status
    loading, error,
    // fields
    title, setTitle,
    description, setDescription,
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate,
    endTime, setEndTime,
    allDay, setAllDay,
    location, setLocation,
    // assignments
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,
    // recurrence
    showRecurringOptions, toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays, handleDayToggle,
    // extras
    showAdditionalOptions, toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,
    // flags
    isEditing, isRecurringParent, isRecurringInstance,
    editMode, setEditMode,
    // computed lists
    assignableFamilyMembers: familyMembers.filter(m=>m.category==='immediate_family'),
    driverHelperFamilyMembers: familyMembers.filter(/*…*/),
    // utils
    getDisplayName, getDayLetter, getSelectedDaysSummary
  }
}