// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, isValid, parseISO } from 'date-fns'

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
  // ---- state ----
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, _setEndDate] = useState('')
  const [endTime, _setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Recurrence & extras omitted for brevity…

  // ---- initialize on open/event change ----
  useEffect(() => {
    if (!isOpen) return

    // basic fields
    setTitle(event.title || '')
    setDescription(event.description || '')
    setAllDay(event.all_day || false)
    setLocation(event.location || '')

    // start/end defaults
    let sd = event.start_time ? new Date(event.start_time) : new Date()
    let ed = event.end_time ? new Date(event.end_time) : addHours(sd, 1)
    if (!event.start_time) sd.setHours(9, 0, 0, 0), ed = addHours(sd, 1)

    const sdDate = format(sd, 'yyyy-MM-dd')
    const sdTime = format(sd, 'HH:mm')
    const edDate = format(ed, 'yyyy-MM-dd')
    const edTime = format(ed, 'HH:mm')

    setStartDate(sdDate)
    setStartTime(sdTime)
    _setEndDate(edDate)
    _setEndTime(edTime)

    // assignments
    const assigns = event.event_assignments || []
    setAssignedMembers(assigns.filter((a:any) => !a.is_driver_helper).map((a:any)=>a.family_member_id))
    const drv = assigns.find((a:any)=>a.is_driver_helper)
    setDriverHelper(drv?.family_member_id || '')
  }, [isOpen, event])

  // ---- QoL #1: auto-sync endDate to match startDate ----
  useEffect(() => {
    _setEndDate(startDate)
  }, [startDate])

  // ---- QoL #2: auto-sync endTime = startTime + 1h ----
  useEffect(() => {
    if (!startTime) return
    const [h, m] = startTime.split(':').map(Number)
    if (isNaN(h)) return

    const dt = new Date(`${startDate}T${startTime}`)
    dt.setHours(dt.getHours() + 1)
    _setEndTime(format(dt, 'HH:mm'))
  }, [startTime, startDate])

  // ---- QoL #3: if manual endTime < startTime in AM, flip to PM ----
  const setEndTime = (v: string) => {
    const [sh, sm] = startTime.split(':').map(Number)
    let [eh, em] = v.split(':').map(Number)
    if (sh < 12 && eh <= sh) {
      eh = (eh + 12) % 24
    }
    const hh = String(eh).padStart(2, '0')
    const mm = String(em).padStart(2, '0')
    _setEndTime(`${hh}:${mm}`)
  }

  // ---- handlers omitted for brevity… include handleSave, handleDelete, etc. ----

  return {
    isOpen, onClose,
    title, setTitle,
    description, setDescription,
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate: _setEndDate,
    endTime, setEndTime,
    allDay, setAllDay,
    location, setLocation,
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,
    loading, error,
    // recurrence & extras…
    onSave: async () => { /* your save logic */ },
    onDelete: async () => { /* your delete logic */ },
    // …plus any other handlers you need
  }
}