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
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count' | 'date'>('count')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime] = useState('')
  const [driveTime, setDriveTime] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [isRecurringParent, setIsRecurringParent] = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode] = useState<'single' | 'all'>('single')

  // initialize when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return

    // ...existing initialization (no changes)
  }, [isOpen, event])

  // QoL #1 & #2: mirror & bump
  useEffect(() => {
    if (!startDate || !startTime) return
    setEndDate(startDate)
    const parsed = parse(startTime, 'HH:mm', new Date())
    if (!isValid(parsed)) return
    setEndTime(format(addHours(parsed, 1), 'HH:mm'))
  }, [startDate, startTime])

  // QoL #3: auto-bump into PM for morning wrap
  useEffect(() => {
    if (!startDate || !startTime) return
    setEndDate(startDate)
    const parsed = parse(startTime, 'HH:mm', new Date())
    if (!isValid(parsed)) return
    let bumped = addHours(parsed, 1)
    const startHour = parsed.getHours()
    if (startHour < 12 && bumped.getHours() < startHour) {
      bumped = addHours(parsed, 13)
    }
    setEndTime(format(bumped, 'HH:mm'))
  }, [startDate, startTime])

  // QoL #3: manual end-time bump
  useEffect(() => {
    if (!startTime || !endTime) return
    const ps = parse(startTime, 'HH:mm', new Date())
    const pe = parse(endTime, 'HH:mm', new Date())
    if (!isValid(ps) || !isValid(pe)) return
    const sh = ps.getHours(), eh = pe.getHours()
    if (sh < 12 && eh <= sh) {
      setEndTime(format(addHours(pe, 12), 'HH:mm'))
    }
  }, [startTime, endTime])

  // weekly default day (unchanged)
  useEffect(() => {
    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-us', { weekday: 'long' }).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType, startDate, startTime])

  // assignment helpers (unchanged)

  // save
  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      // ...validation & upsert logic (unchanged)
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  // delete
  const handleDelete = async () => {
    // ...unchanged delete logic
  }

  return {
    isOpen,
    onClose,
    handleSave,
    handleDelete,
    loading,
    error,
    // ...other returned props (unchanged)
  }
}
