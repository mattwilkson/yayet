// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, parseISO, isValid, set } from 'date-fns'

interface UseEventModalLogicProps {
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
  // --- state ---
  const [title, setTitle]                 = useState('')
  const [description, setDescription]     = useState('')
  const [startDate, _setStartDate]        = useState('')
  const [startTime, _setStartTime]        = useState('')
  const [endDate, _setEndDate]            = useState('')
  const [endTime, _setEndTime]            = useState('')
  const [allDay, setAllDay]               = useState(false)
  const [location, setLocation]           = useState('')
  const [assignedMembers, setAssignedMembers] = useState<string[]>([])
  const [driverHelper, setDriverHelper]   = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  // Recurrence & extras omitted for brevity...

  // --- Initialize when modal opens or event changes ---
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
    _setEndDate(format(sd, 'yyyy-MM-dd'))    // 1) sync end date to start
    _setEndTime(format(ed, 'HH:mm'))

    // ...rest of init (assignments, recurrence)...
  }, [isOpen, event])

  // --- QoL #1: whenever startDate changes, update endDate to match ---
  const setStartDate = useCallback((v: string) => {
    _setStartDate(v)
    _setEndDate(v)
  }, [])

  // --- QoL #2: when startTime changes, bump endTime 1h later ---
  const setStartTime = useCallback((v: string) => {
    _setStartTime(v)
    // parse into a Date on same day...
    const [h, m] = v.split(':').map(Number)
    const base = new Date(`${startDate}T${v}`)
    if (isValid(base)) {
      const later = addHours(base, 1)
      _setEndTime(format(later, 'HH:mm'))
    }
  }, [startDate])

  // --- handle manual end-time edits: if end < start, assume PM and add 12h ---
  const setEndTime = useCallback((v: string) => {
    // parse the raw time on the startDate
    let candidate = new Date(`${startDate}T${v}`)
    if (isValid(candidate)) {
      // compare to start
      const startDt = new Date(`${startDate}T${startTime}`)
      if (candidate < startDt) {
        candidate = addHours(candidate, 12)
      }
      _setEndTime(format(candidate, 'HH:mm'))
    } else {
      // fallback to raw
      _setEndTime(v)
    }
  }, [startDate, startTime])

  // --- DELETE / SAVE omitted for brevity ---

  return {
    isOpen,
    onClose,

    // basic fields
    title, setTitle,
    description, setDescription,

    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate: _setEndDate,   // endDate only manually edited
    endTime, setEndTime,

    allDay, setAllDay,
    location, setLocation,

    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,

    loading, error,

    // ...recurrence, assignments, handlers...
    onSave: /* your handleSave */,
    onDelete: /* your handleDelete */,
    // …
  }
}