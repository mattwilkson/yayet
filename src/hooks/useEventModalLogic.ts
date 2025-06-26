// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid } from 'date-fns'

// Helper to strip a composite UUID back to its “parent” UUID
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5 ? parts.slice(0,5).join('-') : eventId
}

interface UseEventModalLogicProps {
  isOpen: boolean
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
  onClose: () => void
  onSave: () => void
}

export function useEventModalLogic({
  isOpen, event, familyMembers,
  familyId, userId, onClose, onSave
}: UseEventModalLogicProps) {
  // --- UI state ---
  const [title, setTitle]                   = useState('')
  const [description, setDescription]       = useState('')
  const [startDate, setStartDate]           = useState('')
  const [startTime, setStartTime]           = useState('')
  const [endDate, setEndDate]               = useState('')
  const [endTime, setEndTime]               = useState('')
  const [allDay, setAllDay]                 = useState(false)
  const [location, setLocation]             = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper]     = useState('')

  const [showRecurringOptions, setShowRecurringOptions] = useState(false)
  const [recurrenceType, setRecurrenceType]             = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval]     = useState(1)
  const [recurrenceEndType, setRecurrenceEndType]       = useState<'count'|'date'>('count')
  const [recurrenceEndCount, setRecurrenceEndCount]     = useState(10)
  const [recurrenceEndDate, setRecurrenceEndDate]       = useState('')
  const [selectedDays, setSelectedDays]                 = useState<string[]>([])

  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime]                   = useState('')
  const [driveTime, setDriveTime]                       = useState('')

  const [isEditing, setIsEditing]                       = useState(false)
  const [isRecurringParent, setIsRecurringParent]       = useState(false)
  const [isRecurringInstance, setIsRecurringInstance]   = useState(false)
  const [editMode, setEditMode]                         = useState<'single'|'all'>('single')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Populate all of the above when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return

    // Basic fields
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day ?? false)
    setLocation(event.location || '')

    // Determine start/end DateTimes
    let sd = new Date(), ed = new Date()
    if (event.start_time && event.end_time) {
      sd = new Date(event.start_time)
      ed = new Date(event.end_time)
    } else {
      sd.setHours(9,0,0,0)
      ed = addHours(sd, 1)
    }
    setStartDate(format(sd, 'yyyy-MM-dd'))
    setStartTime(format(sd, 'HH:mm'))
    setEndDate(format(ed, 'yyyy-MM-dd'))
    setEndTime(format(ed, 'HH:mm'))

    // Recurrence/editing flags
    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    // Assignments
    const assignments = event.event_assignments || []
    setAssignedMembers(
      assignments.filter((a:any)=>!a.is_driver_helper).map((a:any)=>a.family_member_id)
    )
    const driver = assignments.find((a:any)=>a.is_driver_helper)
    setDriverHelper(driver?.family_member_id || '')

    // Recurrence rule parse
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

    // Additional tools
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // Default selected day for weekly
  useEffect(() => {
    if (recurrenceType==='weekly' && selectedDays.length===0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-us',{ weekday:'long' }).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType])

  // Toggle helpers
  const toggleRecurringOptions   = () => setShowRecurringOptions(!showRecurringOptions)
  const toggleAdditionalOptions  = () => setShowAdditionalOptions(!showAdditionalOptions)
  const handleDayToggle          = (d:string) => 
    setSelectedDays(ss => ss.includes(d) ? ss.filter(x=>x!==d) : [...ss,d])

  // Filter helpers
  const assignableFamilyMembers = familyMembers.filter(m=>m.category==='immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m=> {
    if (['extended_family','caregiver'].includes(m.category)) return true
    if (m.category!=='immediate_family') return false
    if (!m.birthday) return ['Mother','Father'].includes(m.relationship)
    const year = parseInt(m.birthday.split('/').pop()||'0')
    return new Date().getFullYear() - year >= 16
  })

  const getDisplayName = (m:any)=> m.nickname?.trim()||m.name
  const getDayLetter   = (d:string)=> ({sunday:'S',monday:'M',tuesday:'T',wednesday:'W',thursday:'T',friday:'F',saturday:'S'} as any)[d]
  const getSelectedDaysSummary = () => {
    const order = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    return selectedDays.sort((a,b)=>order.indexOf(a)-order.indexOf(b))
                       .map(d=>d[0].toUpperCase()+d.slice(1)).join(', ')
  }

  // CRUD handlers
  const handleSaveClick = async () => {
    setLoading(true); setError('')
    // …validate, build eventData & recurrence_rule JSON…
    // …call supabase insert/update per your existing logic…
    try {
      // (copy over your save logic here)
      await handleSave() // call parent
    } catch(e:any) {
      setError(e.message||'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = async () => {
    if (!confirm('Delete this event?')) return
    setLoading(true); setError('')
    try {
      // …delete logic (strip parent ID, supabase delete or exception marker)…
      await handleDelete() // call parent
    } catch(e:any) {
      setError(e.message||'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return {
    // UI state + handlers for EventModalUI.tsx:
    isOpen, onClose, onSave: handleSaveClick, onDelete: handleDeleteClick,
    loading, error,

    title, setTitle, description, setDescription,
    startDate, setStartDate, startTime, setStartTime,
    endDate, setEndDate, endTime, setEndTime,
    allDay, setAllDay, location, setLocation,

    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,

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
    editMode, setEditMode,

    assignableFamilyMembers, driverHelperFamilyMembers,
    getDisplayName, getDayLetter, getSelectedDaysSummary,

    handleSave: handleSaveClick,
    handleDelete: handleDeleteClick
  }
}