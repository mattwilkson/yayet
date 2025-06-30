import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid, parseISO } from 'date-fns'

// Helper to strip composite UUID back to its “parent” UUID
type RecurrenceRule = { type: string; interval: number; days?: string[]; endDate?: string; endCount?: number }
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
  const [recurrenceType, setRecurrenceType] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count'|'date'>('count')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime] = useState('')
  const [driveTime, setDriveTime] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [isRecurringParent, setIsRecurringParent] = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode] = useState<'single'|'all'>('single')

  // initialize when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // parse dates
    let sd = event.start_time ? parseISO(event.start_time) : new Date()
    let ed = event.end_time ? parseISO(event.end_time) : addHours(sd, 1)
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
    setAssignedMembers(assigns.filter((a:any)=>!a.is_driver_helper).map((a:any)=>a.family_member_id))
    const driver = assigns.find((a:any)=>a.is_driver_helper)
    setDriverHelper(driver?.family_member_id || '')

    // recurrence
    setShowRecurringOptions(false)
    setRecurrenceType('none')
    setRecurrenceInterval(1)
    setRecurrenceEndType('count')
    setRecurrenceEndCount(10)
    setRecurrenceEndDate(format(addHours(ed, 24*30), 'yyyy-MM-dd'))
    setSelectedDays([])
    if (event.recurrence_rule) {
      try {
        const r: RecurrenceRule = JSON.parse(event.recurrence_rule)
        setRecurrenceType(r.type)
        setRecurrenceInterval(r.interval)
        if (r.days) setSelectedDays(r.days)
        if (r.endDate) { setRecurrenceEndType('date'); setRecurrenceEndDate(r.endDate) }
        else if (r.endCount) setRecurrenceEndCount(r.endCount)
        setShowRecurringOptions(true)
      } catch {} }

    // extras
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // ----- QoL #1 & #2 & #3: auto-sync end date/time -----
  useEffect(() => {
    // whenever startDate or startTime changes, bump end by 1h
    const sd = new Date(`${startDate}T${startTime}`)
    if (!isValid(sd)) return
    const ed = addHours(sd, 1)
    // keep same date
    setEndDate(format(ed, 'yyyy-MM-dd'))
    setEndTime(format(ed, 'HH:mm'))
  }, [startDate, startTime])

  // handlers
  const toggleRecurringOptions = () => setShowRecurringOptions(x=>!x)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(x=>!x)
  const handleDayToggle = (d:string) =>
    setSelectedDays(xs => xs.includes(d) ? xs.filter(x=>x!==d) : [...xs,d])

  // assignment helpers
  async function createEventAssignments(eid:string, members:string[], driver?:string) { /* ... */ }
  async function updateEventAssignments(eid:string, members:string[], driver?:string) { /* ... */ }

  // save
  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      const sd = new Date(`${startDate}T${startTime}`), ed = new Date(`${endDate}T${endTime}`)
      if (!isValid(sd)||!isValid(ed)) throw new Error('Invalid date/time')
      if (ed < sd) throw new Error('End must be after start')
      if (recurrenceType==='weekly' && selectedDays.length===0) throw new Error('Select at least one day')

      const data: any = { title, description: description||null,... }
      let rule:Partial<RecurrenceRule>|null = null
      if (recurrenceType!=='none' && !isRecurringInstance) {
        rule = { type: recurrenceType, interval: recurrenceInterval }
        if (recurrenceType==='weekly') rule.days = selectedDays
        if (recurrenceEndType==='date') rule.endDate = recurrenceEndDate
        else rule.endCount = recurrenceEndCount
      }

      // insert/update logic (same as before)
      // ...supabase calls...
      onSave()
    } catch(err:any){ setError(err.message||'Save failed') }
    finally{ setLoading(false) }
  }

  // delete
  const handleDelete = async() => { /* ... */ }

  // computed lists
  const assignableFamilyMembers = familyMembers.filter(m=>m.category==='immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m=>/* ... */)
  const getDisplayName = (m:any)=> m.nickname?.trim()||m.name
  const dayMap:Record<string,string> = {/* ... */}
  const getDayLetter = (d:string)=> dayMap[d]||d.charAt(0).toUpperCase()
  const getSelectedDaysSummary = ()=> selectedDays.join(', ')

  return {
    // modal
    isOpen, onClose,
    // actions
    handleSave, handleDelete,
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
    // lists & utils
    assignableFamilyMembers, driverHelperFamilyMembers,
    getDisplayName, getDayLetter, getSelectedDaysSummary
  }
}