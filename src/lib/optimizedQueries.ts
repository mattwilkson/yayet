// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect, useCallback } from 'react'
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
  const [title, setTitle]                     = useState('')
  const [description, setDescription]         = useState('')
  const [startDate, _setStartDate]            = useState('')
  const [startTime, _setStartTime]            = useState('')
  const [endDate, _setEndDate]                = useState('')
  const [endTime, _setEndTime]                = useState('')
  const [allDay, setAllDay]                   = useState(false)
  const [location, setLocation]               = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper]       = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')

  // (recurrence and extra-options state omitted for brevity...)

  // ----- initialize when modal opens or event changes -----
  useEffect(() => {
    if (!isOpen) return

    // Basic fields
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // Dates & times: if existing event, parse; else default 9–10am
    let sd = new Date(), ed = addHours(sd, 1)
    if (event.start_time && event.end_time) {
      sd = new Date(event.start_time)
      ed = new Date(event.end_time)
    } else {
      sd.setHours(9, 0, 0, 0)
      ed = addHours(sd, 1)
    }
    _setStartDate(format(sd, 'yyyy-MM-dd'))
    _setStartTime(format(sd, 'HH:mm'))
    _setEndDate(format(sd, 'yyyy-MM-dd'))   // QoL #1: sync end date to start
    _setEndTime(format(ed, 'HH:mm'))

    // (assignments, recurrence flags, extra-options init...)
  }, [isOpen, event])

  // ----- QoL #1: whenever startDate changes, update endDate to match -----
  const setStartDate = useCallback((v: string) => {
    _setStartDate(v)
    _setEndDate(v)
  }, [])

  // ----- QoL #2: when startTime changes, bump endTime 1h later -----
  const setStartTime = useCallback((v: string) => {
    _setStartTime(v)
    const base = new Date(`${startDate}T${v}`)
    if (isValid(base)) {
      const later = addHours(base, 1)
      _setEndTime(format(later, 'HH:mm'))
    }
  }, [startDate])

  // ----- handle manual end-time edits: if end < start, assume PM and add 12h -----
  const setEndTime = useCallback((v: string) => {
    let candidate = new Date(`${startDate}T${v}`)
    if (isValid(candidate)) {
      const startDt = new Date(`${startDate}T${startTime}`)
      if (candidate < startDt) {
        candidate = addHours(candidate, 12)
      }
      _setEndTime(format(candidate, 'HH:mm'))
    } else {
      _setEndTime(v)
    }
  }, [startDate, startTime])

  // ----- CRUD helpers (create/update/delete events + assignments) -----
  async function createEventAssignments(eid: string, members: string[], driver?: string) {
    if (members.length) {
      const payload = members.map(id => ({ event_id: eid, family_member_id: id, is_driver_helper: false }))
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
  async function updateEventAssignments(eid: string, members: string[], driver?: string) {
    let { error } = await supabase.from('event_assignments').delete().eq('event_id', eid)
    if (error) throw error
    await createEventAssignments(eid, members, driver)
  }

  // ----- save / delete handlers -----
  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      const sd = new Date(`${startDate}T${startTime}`)
      const ed = new Date(`${endDate}T${endTime}`)
      if (!isValid(sd) || !isValid(ed)) throw new Error('Invalid date/time')
      if (ed < sd) throw new Error('End must be after start')

      // Build payload
      const payload: any = {
        title,
        description: description || null,
        start_time: sd.toISOString(),
        end_time: ed.toISOString(),
        all_day: allDay,
        location: location || null,
        family_id: familyId,
        created_by_user_id: userId
      }

      const pid = extractParentEventId(event.id || '')
      if (event.id) {
        // UPDATE existing
        await supabase.from('events').update(payload).eq('id', pid)
        await updateEventAssignments(pid, assignedMembers, driverHelper)
      } else {
        // CREATE new
        const { data: single, error } = await supabase
          .from('events')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        await createEventAssignments(single.id, assignedMembers, driverHelper)
      }

      onSave()
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return
    setLoading(true)
    setError('')
    try {
      const pid = extractParentEventId(event.id || '')
      await supabase.from('events').delete().eq('id', pid)
      onDelete()
    } catch (err: any) {
      setError(err.message || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // ----- computed lists & helpers -----
  const assignableFamilyMembers = familyMembers.filter(m => m.category === 'immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m => {
    if (['extended_family','caregiver'].includes(m.category)) return true
    if (!m.birthday) return ['Mother','Father'].includes(m.relationship)
    const year = parseInt(m.birthday.split('/').pop() || '0')
    return (new Date().getFullYear() - year) >= 16
  })
  const getDisplayName = (m: any) => m.nickname?.trim() || m.name
  const dayMap: Record<string,string> = {
    sunday:'S', monday:'M', tuesday:'T',
    wednesday:'W', thursday:'T', friday:'F', saturday:'S'
  }
  const getDayLetter = (d: string) => dayMap[d] || d.charAt(0).toUpperCase()

  return {
    // Modal control
    isOpen,
    onClose,

    // Save & delete
    onSave: handleSave,
    onDelete: handleDelete,

    // Status
    loading,
    error,

    // Basic fields
    title, setTitle,
    description, setDescription,

    startDate, setStartDate,
    startTime, setStartTime,
    endDate, _setEndDate,   // manually editable
    endTime, setEndTime,

    allDay, setAllDay,
    location, setLocation,

    // Assignments
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,

    // Computed lists & helpers
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    getDisplayName,
    getDayLetter
  }
}