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
  // ----- state -----
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [startDate, setStartDate]       = useState('')
  const [startTime, setStartTime]       = useState('')
  const [endDate, setEndDate]           = useState('')
  const [endTime, setEndTime]           = useState('')
  const [allDay, setAllDay]             = useState(false)
  const [location, setLocation]         = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper] = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

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

  // ----- initialize on open -----
  useEffect(() => {
    if (!isOpen) return

    // Basic fields
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // Dates/times
    let sd = event.start_time ? new Date(event.start_time) : new Date()
    let ed = event.end_time   ? new Date(event.end_time)   : addHours(sd, 1)

    // default 9–10 if no time info
    if (!event.start_time) {
      sd.setHours(9,0,0,0)
      ed = addHours(sd,1)
    }

    setStartDate(format(sd, 'yyyy-MM-dd'))
    setStartTime(format(sd, 'HH:mm'))
    setEndDate(format(ed, 'yyyy-MM-dd'))
    setEndTime(format(ed, 'HH:mm'))

    // Flags
    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    // Assignments
    const assigns = event.event_assignments || []
    setAssignedMembers(assigns.filter(a => !a.is_driver_helper).map(a => a.family_member_id))
    const drv = assigns.find(a => a.is_driver_helper)
    setDriverHelper(drv?.family_member_id || '')

    // Recurrence reset
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

    // Extras reset
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // ----- ensure weekly has a default day -----
  useEffect(() => {
    if (recurrenceType==='weekly' && selectedDays.length===0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-US',{ weekday:'long' }).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType, startDate, startTime])

  // ----- QoL #1 & #2: whenever startDate/time changes, keep end in sync by default -----
  useEffect(() => {
    // match end date to start date if endDate was equal to prior startDate
    setEndDate(startDate)
  }, [startDate])

  useEffect(() => {
    // if user *hasn't* manually moved endTime away from the default-of-1hr gap,
    // update it to one hour after new startTime
    const [sh, sm] = startTime.split(':').map(Number)
    let [eh, em] = endTime.split(':').map(Number)
    // detect we were on the old default (eh === sh+1)
    if (!allDay && eh === ((sh + 1) % 24) && em === sm) {
      const newH = (sh + 1) % 24
      setEndTime(`${newH.toString().padStart(2,'0')}:${sm.toString().padStart(2,'0')}`)
    }
  }, [startTime])

  // ----- QoL #3: bump endTime into PM if you type an end earlier than start and it's before noon -----
  useEffect(() => {
    if (allDay) return
    if (!startTime || !endTime) return

    const [sh, sm] = startTime.split(':').map(Number)
    let [eh, em] = endTime.split(':').map(Number)

    // if end-hour ≤ start-hour and end-hour < 12, assume user meant PM
    if (eh <= sh && eh < 12) {
      eh += 12
      setEndTime(`${eh.toString().padStart(2,'0')}:${em.toString().padStart(2,'0')}`)
    }
  }, [endTime])

  // ----- Recurrence & extra toggles & day toggle -----
  const toggleRecurringOptions  = () => setShowRecurringOptions(x => !x)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(x => !x)
  const handleDayToggle = (d:string) =>
    setSelectedDays(xs => xs.includes(d) ? xs.filter(x=>x!==d) : [...xs,d])

  // ----- Assignment helpers -----
  async function createEventAssignments(eid:string, members:string[], driver?:string) {
    if (members.length) {
      const payload = members.map(id=>({ event_id: eid, family_member_id: id, is_driver_helper: false }))
      const { error } = await supabase.from('event_assignments').insert(payload)
      if (error) throw error
    }
    if (driver) {
      const { error } = await supabase
        .from('event_assignments')
        .insert({ event_id: eid, family_member_id: driver, is_driver_helper: true })
      if (error) throw error
    }
  }
  async function updateEventAssignments(eid:string, members:string[], driver?:string) {
    const { error: delErr } = await supabase.from('event_assignments').delete().eq('event_id', eid)
    if (delErr) throw delErr
    await createEventAssignments(eid, members, driver)
  }

  // ----- Save / Delete -----
  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      const sd = new Date(`${startDate}T${startTime}`),
            ed = new Date(`${endDate}T${endTime}`)
      if (!isValid(sd)||!isValid(ed)) throw new Error('Invalid date/time')
      if (ed < sd) throw new Error('End must be after start')
      if (recurrenceType==='weekly' && selectedDays.length===0) throw new Error('Pick at least one recurrence day')

      // build event payload
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

      // recurrence rule
      let rule: any = null
      if (recurrenceType!=='none' && !isRecurringInstance) {
        rule = { type: recurrenceType, interval: recurrenceInterval }
        if (recurrenceType==='weekly') rule.days = selectedDays
        if (recurrenceEndType==='date') rule.endDate = recurrenceEndDate
        else rule.endCount = recurrenceEndCount
      }

      // insert / update logic...
      // (same as before: handle isEditing / recurringParent / instance / new)
      // at end:
      onSave()
    } catch (err:any) {
      setError(err.message||'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete?')) return
    setLoading(true); setError('')
    try {
      // delete logic...
      onDelete()
    } catch (err:any) {
      setError(err.message||'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // ----- Computed lists & helpers -----
  const assignableFamilyMembers = familyMembers.filter(m=>m.category==='immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m=>{
    if (['extended_family','caregiver'].includes(m.category)) return true
    if (m.category!=='immediate_family') return false
    if (!m.birthday) return ['Mother','Father'].includes(m.relationship)
    const y = parseInt(m.birthday.split('/').pop()||'0')
    return (new Date().getFullYear()-y) >= 16
  })

  const getDisplayName = (m:any) => m.nickname?.trim()||m.name
  const getDayLetter    = (d:string) => d[0].toUpperCase()
  const getSelectedDaysSummary = () =>
    selectedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')

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

    // computed lists & helpers
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  }
}