// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid } from 'date-fns'

// Helper to strip a composite UUID back to its “parent” UUID
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

  // Keep track of previous startDate so we only override endDate
  // when it was previously in sync.
  const prevStartDateRef = useRef<string>(startDate)

  // --- Initialize when modal opens or event changes ---
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
    const sdDate = format(sd, 'yyyy-MM-dd')
    const sdTime = format(sd, 'HH:mm')
    const edDate = format(ed, 'yyyy-MM-dd')
    const edTime = format(ed, 'HH:mm')

    setStartDate(sdDate)
    setStartTime(sdTime)
    setEndDate(edDate)
    setEndTime(edTime)
    prevStartDateRef.current = sdDate

    // Recurrence/editing flags
    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    // Assignments
    const assigns = event.event_assignments || []
    setAssignedMembers(assigns.filter((a:any)=>!a.is_driver_helper).map((a:any)=>a.family_member_id))
    const driver = assigns.find((a:any)=>a.is_driver_helper)
    setDriverHelper(driver?.family_member_id || '')

    // Reset & parse recurrence
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

    // Reset additional
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // --- QoL #1: Whenever startDate changes, mirror it into endDate
  useEffect(() => {
    if (!isOpen) return
    // Only override if endDate was previously matching the old startDate
    if (endDate === prevStartDateRef.current) {
      setEndDate(startDate)
    }
    prevStartDateRef.current = startDate
  }, [startDate])

  // --- QoL #2: Whenever startTime changes, bump endTime 1 hour later
  useEffect(() => {
    if (!isOpen) return
    const [h, m] = startTime.split(':').map(n=>parseInt(n,10))
    if (!isNaN(h) && !isNaN(m)) {
      // Use startDate so DST etc. is respected
      const dt = new Date(`${startDate}T${startTime}`)
      dt.setHours(h + 1, m)
      if (isValid(dt)) {
        setEndTime(format(dt, 'HH:mm'))
      }
    }
  }, [startTime, startDate])

  // Default selected day for weekly
  useEffect(() => {
    if (recurrenceType==='weekly' && selectedDays.length===0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-us',{ weekday:'long' }).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType, startDate, startTime])

  // Toggle helpers
  const toggleRecurringOptions   = () => setShowRecurringOptions(x=>!x)
  const toggleAdditionalOptions  = () => setShowAdditionalOptions(x=>!x)
  const handleDayToggle          = (d:string) =>
    setSelectedDays(xs=> xs.includes(d) ? xs.filter(x=>x!==d) : [...xs,d])

  // Assignment CRUD
  async function createEventAssignments(eid:string, members:string[], driver?:string) {
    if (members.length) {
      const payload = members.map(id=>({
        event_id: eid,
        family_member_id: id,
        is_driver_helper: false
      }))
      let { error } = await supabase.from('event_assignments').insert(payload)
      if (error) throw error
    }
    if (driver) {
      let { error } = await supabase
        .from('event_assignments')
        .insert({ event_id: eid, family_member_id: driver, is_driver_helper: true })
      if (error) throw error
    }
  }
  async function updateEventAssignments(eid:string, members:string[], driver?:string) {
    let { error } = await supabase.from('event_assignments').delete().eq('event_id', eid)
    if (error) throw error
    await createEventAssignments(eid, members, driver)
  }

  // Handle Save
  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      const sd = new Date(`${startDate}T${startTime}`)
      const ed = new Date(`${endDate}T${endTime}`)
      if (!isValid(sd)||!isValid(ed)) throw new Error('Invalid date/time')
      if (ed < sd) throw new Error('End must be after start')
      if (recurrenceType==='weekly' && !selectedDays.length) throw new Error('Select at least one day')

      // Build payload
      const data: any = {
        title,
        description: description||null,
        start_time: sd.toISOString(),
        end_time: ed.toISOString(),
        all_day: allDay,
        location: location||null,
        family_id: familyId,
        created_by_user_id: userId
      }
      // Build recurrence rule if needed
      let rule: any = null
      if (recurrenceType!=='none' && !isRecurringInstance) {
        rule = { type: recurrenceType, interval: recurrenceInterval }
        if (recurrenceType==='weekly') rule.days = selectedDays
        if (recurrenceEndType==='date') rule.endDate = recurrenceEndDate
        else rule.endCount = recurrenceEndCount
      }

      // Insert or Update...
      if (isEditing) {
        const pid = extractParentEventId(event.id)
        if (isRecurringParent && editMode==='all') {
          await supabase
            .from('events')
            .update({ ...data, recurrence_rule: rule?JSON.stringify(rule):null })
            .eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        }
        else if (isRecurringInstance && editMode==='single') {
          await supabase.from('events').update(data).eq('id', event.id)
          await updateEventAssignments(event.id, assignedMembers, driverHelper)
        }
        else {
          await supabase.from('events').update(data).eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        }
      } else {
        // New event
        if (recurrenceType!=='none') {
          const { data: parent, error } = await supabase
            .from('events')
            .insert({ ...data, recurrence_rule: JSON.stringify(rule), is_recurring_parent: true })
            .select().single()
          if (error) throw error
          await createEventAssignments(parent.id, assignedMembers, driverHelper)
        } else {
          const { data: single, error } = await supabase
            .from('events')
            .insert(data)
            .select().single()
          if (error) throw error
          await createEventAssignments(single.id, assignedMembers, driverHelper)
        }
      }

      onSave()
    } catch (err: any) {
      setError(err.message||'Save failed')
    } finally {
      setLoading(false)
    }
  }

  // Handle Delete
  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return
    setLoading(true); setError('')
    try {
      const pid = extractParentEventId(event.id)
      if (isRecurringParent && editMode==='all') {
        await supabase.from('events').delete().eq('id', pid)
      } else if (isRecurringInstance && editMode==='single') {
        await supabase.from('events').delete().eq('id', event.id)
      } else {
        await supabase.from('events').delete().eq('id', pid)
      }
      onDelete()
    } catch (err:any) {
      setError(err.message||'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // Computed lists & helpers
  const assignableFamilyMembers = familyMembers.filter(m=>m.category==='immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m=> {
    if (['extended_family','caregiver'].includes(m.category)) return true
    if (m.category!=='immediate_family') return false
    if (!m.birthday) return ['Mother','Father'].includes(m.relationship)
    const year = parseInt(m.birthday.split('/').pop()||'0',10)
    return (new Date().getFullYear() - year) >= 16
  })
  const getDisplayName = (m:any) => m.nickname?.trim()||m.name
  const dayMap: Record<string,string> = {
    sunday:'S', monday:'M', tuesday:'T',
    wednesday:'W', thursday:'T', friday:'F', saturday:'S'
  }
  const getDayLetter = (d:string) => dayMap[d] || d.charAt(0).toUpperCase()
  const getSelectedDaysSummary = () =>
    selectedDays
      .slice()
      .sort((a,b)=> ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(a)
                  - ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(b))
      .map(d=> d.charAt(0).toUpperCase()+d.slice(1))
      .join(', ')

  return {
    // Modal control
    isOpen, onClose,

    // Save/Delete
    handleSave, handleDelete,

    // Status
    loading, error,

    // Fields
    title, setTitle,
    description, setDescription,
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate,
    endTime, setEndTime,
    allDay, setAllDay,
    location, setLocation,

    // Assignments
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,

    // Recurrence
    showRecurringOptions,
    toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays, handleDayToggle,

    // Extra tools
    showAdditionalOptions, toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,

    // Edit flags
    isEditing, isRecurringParent, isRecurringInstance,
    editMode, setEditMode,

    // Computed lists & utils
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  }
}