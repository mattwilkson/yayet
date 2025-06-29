// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect } from 'react'
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
  const [recurrenceType, setRecurrenceType]             =
    useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval]     = useState(1)
  const [recurrenceEndType, setRecurrenceEndType]       =
    useState<'count'|'date'>('count')
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

  // ----- 1) init modal fields whenever it opens or event changes -----
  useEffect(() => {
    if (!isOpen) return

    // Basic
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day ?? false)
    setLocation(event.location || '')

    // Dates
    let sd = new Date(), ed = new Date()
    if (event.start_time && event.end_time) {
      sd = new Date(event.start_time)
      ed = new Date(event.end_time)
    } else {
      sd.setHours(9,0,0,0)
      ed = addHours(sd, 1)
    }
    setStartDate(format(sd,'yyyy-MM-dd'))
    setStartTime(format(sd,'HH:mm'))
    setEndDate(format(ed,'yyyy-MM-dd'))
    setEndTime(format(ed,'HH:mm'))

    // Flags
    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    // Assignments
    const assigns = event.event_assignments || []
    setAssignedMembers(
      assigns.filter((a:any)=>!a.is_driver_helper).map((a:any)=>a.family_member_id)
    )
    const drv = assigns.find((a:any)=>a.is_driver_helper)
    setDriverHelper(drv?.family_member_id||'')

    // Recurrence reset & parse
    setShowRecurringOptions(false)
    setRecurrenceType('none')
    setRecurrenceInterval(1)
    setRecurrenceEndType('count')
    setRecurrenceEndCount(10)
    setRecurrenceEndDate(format(addHours(ed,24*30),'yyyy-MM-dd'))
    setSelectedDays([])
    if (event.recurrence_rule) {
      try {
        const r = JSON.parse(event.recurrence_rule)
        setRecurrenceType(r.type||'none')
        setRecurrenceInterval(r.interval||1)
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

    // Additional tools reset
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // ----- 2) Weekly default days -----
  useEffect(() => {
    if (recurrenceType==='weekly' && selectedDays.length===0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-us',{weekday:'long'}).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType, startDate, startTime, selectedDays])

  // ----- QoL 1: endDate always tracks startDate -----
  useEffect(() => {
    if (startDate) {
      setEndDate(startDate)
    }
  }, [startDate])

  // ----- QoL 2: endTime = startTime + 1h -----
  useEffect(() => {
    if (!startTime) return
    const [h,m] = startTime.split(':').map(Number)
    const dt = new Date()
    dt.setHours(h,m,0,0)
    dt.setHours(dt.getHours()+1)
    setEndTime(format(dt,'HH:mm'))
  }, [startTime])

  // ----- toggles & helpers -----
  const toggleRecurringOptions  = () => setShowRecurringOptions(x=>!x)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(x=>!x)
  const handleDayToggle         = (d:string) =>
    setSelectedDays(xs => xs.includes(d) ? xs.filter(x=>x!==d) : [...xs,d])

  // ----- assignment CRUD -----
  async function createEventAssignments(eid:string, members:string[], driver?:string) {
    if (members.length) {
      const { error } = await supabase.from('event_assignments')
        .insert(members.map(id=>({
          event_id:eid, family_member_id:id, is_driver_helper:false
        })))
      if (error) throw error
    }
    if (driver) {
      const { error } = await supabase.from('event_assignments')
        .insert({ event_id:eid, family_member_id:driver, is_driver_helper:true })
      if (error) throw error
    }
  }
  async function updateEventAssignments(eid:string, members:string[], driver?:string) {
    const { error:del } = await supabase.from('event_assignments')
      .delete().eq('event_id',eid)
    if (del) throw del
    await createEventAssignments(eid,members,driver)
  }

  // ----- Save / Delete handlers -----
  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      const sd = new Date(`${startDate}T${startTime}`),
            ed = new Date(`${endDate}T${endTime}`)
      if (!isValid(sd)||!isValid(ed)) throw new Error('Invalid date/time')
      if (ed<sd) throw new Error('End must be after start')
      if (recurrenceType==='weekly' && selectedDays.length===0)
        throw new Error('Select at least one day for weekly recurrence')

      // build payload
      const payload: any = {
        title,
        description: description||null,
        start_time: sd.toISOString(),
        end_time: ed.toISOString(),
        all_day: allDay,
        location: location||null,
        family_id: familyId,
        created_by_user_id: userId
      }
      // recurrence rule
      let rule:any = null
      if (recurrenceType!=='none' && !isRecurringInstance) {
        rule = { type: recurrenceType, interval: recurrenceInterval }
        if (recurrenceType==='weekly') rule.days = selectedDays
        if (recurrenceEndType==='date') rule.endDate = recurrenceEndDate
        else rule.endCount = recurrenceEndCount
      }

      if (isEditing) {
        const pid = extractParentEventId(event.id)
        if (isRecurringParent && editMode==='all') {
          await supabase.from('events')
            .update({ ...payload, recurrence_rule: rule?JSON.stringify(rule):null })
            .eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        }
        else if (isRecurringInstance && editMode==='single') {
          await supabase.from('events').update(payload).eq('id', event.id)
          await updateEventAssignments(event.id, assignedMembers, driverHelper)
        }
        else {
          await supabase.from('events').update(payload).eq('id', pid)
          await updateEventAssignments(pid, assignedMembers, driverHelper)
        }
      } else {
        if (recurrenceType!=='none') {
          const { data:parent, error } = await supabase
            .from('events')
            .insert({ ...payload, recurrence_rule: JSON.stringify(rule), is_recurring_parent: true })
            .select().single()
          if (error) throw error
          await createEventAssignments(parent.id, assignedMembers, driverHelper)
        } else {
          const { data:single, error } = await supabase
            .from('events')
            .insert(payload).select().single()
          if (error) throw error
          await createEventAssignments(single.id, assignedMembers, driverHelper)
        }
      }

      onSave()
    } catch (e:any) {
      setError(e.message||'Save failed')
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
    } catch (e:any) {
      setError(e.message||'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // ----- computed lists & formatters -----
  const assignableFamilyMembers = familyMembers.filter(m => m.category==='immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m => {
    if (['extended_family','caregiver'].includes(m.category)) return true
    if (m.category!=='immediate_family') return false
    if (!m.birthday) return ['Mother','Father'].includes(m.relationship)
    const year = parseInt(m.birthday.split('/').pop()||'0',10)
    return (new Date().getFullYear()-year) >= 16
  })
  const getDisplayName = (m:any) => m.nickname?.trim()||m.name
  const dayMap:Record<string,string> = {
    sunday:'S', monday:'M', tuesday:'T',
    wednesday:'W', thursday:'T', friday:'F', saturday:'S'
  }
  const getDayLetter = (d:string) => dayMap[d]||d.charAt(0).toUpperCase()
  const getSelectedDaysSummary = () =>
    selectedDays.sort((a,b)=>
      ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
      .indexOf(a) - 
      ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
      .indexOf(b)
    ).map(d=>
      d.charAt(0).toUpperCase()+d.slice(1)
    ).join(', ')

  // ----- expose to UI -----
  return {
    isOpen, onClose,

    // status
    loading, error,

    // basic fields
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

    // lists & formatters
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary,

    // actions
    onSave: handleSave,
    onDelete: handleDelete
  }
}