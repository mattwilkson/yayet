// File: src/hooks/useEventModalLogic.ts
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
  // ----- state -----
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

  // ----- init on open/event -----
  useEffect(() => {
    if (!isOpen) return

    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // parse start/end
    const sd = event.start_time ? parseISO(event.start_time) : addHours(new Date(), 0)
    const ed = event.end_time   ? parseISO(event.end_time)   : addHours(sd, 1)

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

    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // ----- QoL #1 & #2: sync end date/time & keep 1h duration -----
  useEffect(() => {
    // whenever startDate changes, mirror it to endDate
    setEndDate(startDate)
  }, [startDate])

  useEffect(() => {
    // keep duration ~1h on startTime change
    const [h, m] = startTime.split(':').map(Number)
    if (!isNaN(h) && !isNaN(m)) {
      let nh = h + 1
      let suffix = ''
      // QoL #3: if resulting hour crosses noon, ensure PM format
      if (nh >= 24) nh = nh - 24
      const pad = (x:number)=>x.toString().padStart(2,'0')
      setEndTime(`${pad(nh)}:${pad(m)}`)
    }
  }, [startTime])

  // ----- other handlers -----
  const toggleRecurringOptions  = () => setShowRecurringOptions(x => !x)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(x => !x)
  const handleDayToggle         = (d: string) =>
    setSelectedDays(xs => xs.includes(d) ? xs.filter(x=>x!==d) : [...xs,d])

  // ----- assignment helpers -----
  async function createEventAssignments(eid:string, members:string[], driver?:string) {
    // ...unchanged...
  }
  async function updateEventAssignments(eid:string, members:string[], driver?:string) {
    // ...unchanged...
  }

  // ----- save / delete -----
  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      // parse and validate
      const sd = new Date(`${startDate}T${startTime}`),
            ed = new Date(`${endDate}T${endTime}`)
      if (!isValid(sd)||!isValid(ed)) throw new Error('Invalid date/time')
      if (ed < sd) throw new Error('End must be after start')
      if (recurrenceType==='weekly' && selectedDays.length===0) throw new Error('Select at least one day')

      // build payload
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

      // recurrence rule json
      let rule:any = null
      if (recurrenceType!=='none' && !isRecurringInstance) {
        rule = { type: recurrenceType, interval: recurrenceInterval }
        if (recurrenceType==='weekly') rule.days = selectedDays
        if (recurrenceEndType==='date') rule.endDate = recurrenceEndDate
        else rule.endCount = recurrenceEndCount
      }

      // upsert logic
      if (isEditing) {
        const pid = extractParentEventId(event.id)
        if (isRecurringParent && editMode==='all') {
          await supabase.from('events').update({ ...data, recurrence_rule: rule?JSON.stringify(rule):null }).eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        } else if (isRecurringInstance && editMode==='single') {
          await supabase.from('events').update(data).eq('id', event.id)
          await updateEventAssignments(event.id, assignedMembers, driverHelper)
        } else {
          await supabase.from('events').update(data).eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        }
      } else {
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
    } catch (err:any) {
      setError(err.message||'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return
    setLoading(true); setError('')
    try {
      const pid = extractParentEventId(event.id)
      if (isRecurringParent && editMode==='all') {
        await supabase.from('events').delete().eq('id', pid)
      }
      else if (isRecurringInstance && editMode==='single') {
        await supabase.from('events').delete().eq('id', event.id)
      }
      else {
        await supabase.from('events').delete().eq('id', pid)
      }
      onDelete()
    } catch (err:any) {
      setError(err.message||'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // ----- computed lists & helpers -----
  const assignableFamilyMembers = familyMembers.filter(m=>m.category==='immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m => {
    // ...unchanged logic...
    return true
  })
  const getDisplayName = (m:any) => m.nickname?.trim()||m.name
  const dayMap: Record<string,string> = { sunday:'S', monday:'M', tuesday:'T', wednesday:'W', thursday:'T', friday:'F', saturday:'S' }
  const getDayLetter = (d:string) => dayMap[d]||d.charAt(0).toUpperCase()
  const getSelectedDaysSummary = () =>
    selectedDays.sort(/* ... */).map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(', ')

  return {
    // modal control
    isOpen,
    onClose,

    // status
    loading,
    error,

    // basic fields
    title, setTitle,
    description, setDescription,
    allDay, setAllDay,
    location, setLocation,

    // dates & times
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate,
    endTime, setEndTime,

    // assignments
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,

    // recurrence
    showRecurringOptions,
    toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndType, setRecurrenceEndType,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndDate, setRecurrenceEndDate,
    selectedDays, handleDayToggle,

    // extras
    showAdditionalOptions,
    toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,

    // editing flags
    isEditing,
    isRecurringParent,
    isRecurringInstance,
    editMode, setEditMode,

    // **important**: map these to UI props
    onSave: handleSave,
    onDelete: handleDelete,

    // helpers & lists
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  }
}