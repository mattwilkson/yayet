// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, parseISO, isValid } from 'date-fns'

// Helper to strip a composite UUID back to its “parent” UUID
function extractParentEventId(eventId: string): string {
  const parts = eventId.split('-')
  return parts.length > 5 ? parts.slice(0, 5).join('-') : eventId
}

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
type RecurrenceEndType = 'count' | 'date'

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
  // UI state
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

  // Recurrence state
  const [showRecurringOptions, setShowRecurringOptions] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndType, setRecurrenceEndType] = useState<RecurrenceEndType>('count')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  // Additional options
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime] = useState('')
  const [driveTime, setDriveTime] = useState('')

  // Editing flags
  const [isEditing, setIsEditing] = useState(false)
  const [isRecurringParent, setIsRecurringParent] = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode] = useState<'single' | 'all'>('single')

  // Helpers
  const getInitialDateTime = () => {
    if (event?.start_time && event?.end_time) {
      return {
        startDateTime: parseISO(event.start_time),
        endDateTime: parseISO(event.end_time)
      }
    }
    const now = new Date()
    const startDateTime = new Date(now)
    startDateTime.setHours(9, 0, 0, 0)
    const endDateTime = new Date(startDateTime)
    endDateTime.setHours(10, 0, 0, 0)
    return { startDateTime, endDateTime }
  }

  // Initialize state when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return
    const { startDateTime, endDateTime } = getInitialDateTime()

    setTitle(event.title || '')
    setDescription(event.description || '')
    setLocation(event.location || '')
    setAllDay(event.all_day || false)

    setStartDate(format(startDateTime, 'yyyy-MM-dd'))
    setStartTime(format(startDateTime, 'HH:mm'))
    setEndDate(format(endDateTime, 'yyyy-MM-dd'))
    setEndTime(format(endDateTime, 'HH:mm'))

    setIsEditing(!!event.id)
    setIsRecurringParent(!!event.is_recurring_parent)
    setIsRecurringInstance(!!event.parent_event_id)
    setEditMode('single')

    const assignments = event.event_assignments || []
    setAssignedMembers(
      assignments.filter((a: any) => !a.is_driver_helper).map((a: any) => a.family_member_id)
    )
    const driver = assignments.find((a: any) => a.is_driver_helper)
    setDriverHelper(driver?.family_member_id || '')

    // Recurrence reset
    setShowRecurringOptions(false)
    setRecurrenceType('none')
    setRecurrenceInterval(1)
    setRecurrenceEndType('count')
    setRecurrenceEndCount(10)
    setRecurrenceEndDate(format(addHours(endDateTime, 24*30), 'yyyy-MM-dd'))
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

    // Additional options reset
    setShowAdditionalOptions(false)
    setArrivalTime('')
    setDriveTime('')
  }, [isOpen, event])

  // Default selected day for weekly
  useEffect(() => {
    if (recurrenceType === 'weekly' && selectedDays.length === 0) {
      const dt = new Date(`${startDate}T${startTime}`)
      if (isValid(dt)) {
        const dow = dt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
        setSelectedDays([dow])
      }
    }
  }, [recurrenceType, startDate, startTime])

  // Toggles
  const toggleRecurringOptions = () => setShowRecurringOptions(!showRecurringOptions)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(!showAdditionalOptions)
  const handleDayToggle = (day: string) =>
    setSelectedDays(sd => sd.includes(day) ? sd.filter(x => x !== day) : [...sd, day])

  // Assignment helpers
  async function createEventAssignments(eventId: string, memberIds: string[], driverId?: string) {
    if (memberIds.length) {
      const assignments = memberIds.map(id => ({ event_id: eventId, family_member_id: id, is_driver_helper: false }))
      const { error } = await supabase.from('event_assignments').insert(assignments)
      if (error) throw error
    }
    if (driverId) {
      const { error } = await supabase.from('event_assignments').insert({
        event_id: eventId,
        family_member_id: driverId,
        is_driver_helper: true
      })
      if (error) throw error
    }
  }

  async function updateEventAssignments(eventId: string, memberIds: string[], driverId?: string) {
    const { error: delErr } = await supabase.from('event_assignments').delete().eq('event_id', eventId)
    if (delErr) throw delErr
    await createEventAssignments(eventId, memberIds, driverId)
  }

  // Save handler
  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      if (!title.trim()) throw new Error('Title is required')
      const sd = new Date(`${startDate}T${startTime}`)
      const ed = new Date(`${endDate}T${endTime}`)
      if (!isValid(sd) || !isValid(ed)) throw new Error('Invalid date/time')
      if (ed < sd) throw new Error('End must be after start')
      if (recurrenceType === 'weekly' && selectedDays.length === 0) {
        throw new Error('Select at least one day for weekly recurrence')
      }

      const eventData: any = {
        title,
        description: description || null,
        start_time: sd.toISOString(),
        end_time: ed.toISOString(),
        all_day: allDay,
        location: location || null,
        family_id: familyId,
        created_by_user_id: userId
      }

      let rule: any = null
      if (recurrenceType !== 'none' && !isRecurringInstance) {
        rule = { type: recurrenceType, interval: recurrenceInterval }
        if (recurrenceType === 'weekly') rule.days = selectedDays
        if (recurrenceEndType === 'date') rule.endDate = recurrenceEndDate
        else rule.endCount = recurrenceEndCount
      }

      if (isEditing) {
        const id = extractParentEventId(event.id)
        if (isRecurringParent && editMode === 'all') {
          await supabase.from('events').update({ ...eventData, recurrence_rule: rule ? JSON.stringify(rule) : null }).eq('id', id)
          await updateEventAssignments(id, assignedMembers, driverHelper)
        } else if (isRecurringInstance && editMode === 'single') {
          await supabase.from('events').update(eventData).eq('id', event.id)
          await updateEventAssignments(event.id, assignedMembers, driverHelper)
        } else {
          await supabase.from('events').update(eventData).eq('id', id)
          await updateEventAssignments(id, assignedMembers, driverHelper)
        }
      } else {
        if (recurrenceType !== 'none') {
          const { data: parent, error: createErr } = await supabase.from('events').insert({
            ...eventData,
            recurrence_rule: JSON.stringify(rule),
            is_recurring_parent: true
          }).select().single()
          if (createErr) throw createErr
          await createEventAssignments(parent.id, assignedMembers, driverHelper)
        } else {
          const { data: single, error: createErr } = await supabase.from('events').insert(eventData).select().single()
          if (createErr) throw createErr
          await createEventAssignments(single.id, assignedMembers, driverHelper)
        }
      }

      onSave()
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  // Delete handler
  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return
    setLoading(true)
    setError('')
    try {
      const id = extractParentEventId(event.id)
      if (isRecurringParent && editMode === 'all') {
        await supabase.from('events').delete().eq('id', id)
      } else if (isRecurringInstance && editMode === 'single') {
        await supabase.from('events').delete().eq('id', event.id)
      } else {
        await supabase.from('events').delete().eq('id', id)
      }
      onDelete()
    } catch (err: any) {
      setError(err.message || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  // Computed lists
  const assignableFamilyMembers = familyMembers.filter(m => m.category === 'immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(m => {
    if (['extended_family','caregiver'].includes(m.category)) return true
    if (m.category !== 'immediate_family') return false
    if (!m.birthday) return ['Mother','Father'].includes(m.relationship)
    const year = parseInt(m.birthday.split('/').pop() || '0')
    return new Date().getFullYear() - year >= 16
  })

  // Display helpers
  const getDisplayName = (m: any) => m.nickname?.trim() || m.name
  const getDayLetter = (d: string) => ({ sunday:'S', monday:'M', tuesday:'T', wednesday:'W', thursday:'T', friday:'F', saturday:'S' } as Record<string,string>)[d]
  const getSelectedDaysSummary = () => {
    const order = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
    return selectedDays.sort((a,b) => order.indexOf(a) - order.indexOf(b)).map(d => d[0].toUpperCase() + d.slice(1)).join(', ')
  }

  return {
    isOpen,
    onClose,
    loading,
    error,
    title, setTitle,
    description, setDescription,
    startDate, setStartDate,
    startTime, setStartTime,
    endDate, setEndDate,
    endTime, setEndTime,
    allDay, setAllDay,
    location, setLocation,
    assignedMembers, setAssignedMembers,
    driverHelper, setDriverHelper,
    showRecurringOptions,
    toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays,
    showAdditionalOptions,
    toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,
    isEditing,
    isRecurringParent,
    isRecurringInstance,
    editMode, setEditMode,
    assignableFamilyMembers,
    driverHelperFamilyMembers,
    onSave: handleSave,
    onDelete: handleDelete,
    handleDayToggle,
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  }
}