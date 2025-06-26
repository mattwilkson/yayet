// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, parseISO, isValid } from 'date-fns'

export function useEventModalLogic({
  event,
  familyMembers,
  familyId,
  userId,
  onClose,
  onSave,
  onDelete,
}: {
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}) {
  // --- State hooks ---
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
  const [recurrenceType, setRecurrenceType] = useState<'none'|'daily'|'weekly'|'monthly'|'yearly'>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10)
  const [recurrenceEndType, setRecurrenceEndType] = useState<'count'|'date'>('count')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false)
  const [arrivalTime, setArrivalTime] = useState('')
  const [driveTime, setDriveTime] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isRecurringParent, setIsRecurringParent] = useState(false)
  const [isRecurringInstance, setIsRecurringInstance] = useState(false)
  const [editMode, setEditMode] = useState<'single'|'all'>('single')

  // --- Effects to initialize from `event` prop ---
  useEffect(() => {
    if (!event) return
    // populate all your state based on `event` here...
  }, [event])

  // --- Handlers ---
  const toggleRecurringOptions = () => setShowRecurringOptions(f => !f)
  const toggleAdditionalOptions = () => setShowAdditionalOptions(f => !f)
  const handleDayToggle = (day: string) =>
    setSelectedDays(days => days.includes(day) ? days.filter(d => d!==day) : [...days, day])

  const handleSaveInternal = async () => {
    // your full handleSave implementation here...
    await handleSave()
  }

  const handleDeleteInternal = async () => {
    await handleDelete()
  }

  // --- Lists derived from familyMembers ---
  const assignableFamilyMembers = familyMembers.filter(m => m.category === 'immediate_family')
  const driverHelperFamilyMembers = familyMembers.filter(/* your rules */)

  // --- Utilities ---
  const getDisplayName = (member: any) => /* ... */
  const getDayLetter    = (d: string) => /* ... */
  const getSelectedDaysSummary = () => /* ... */

  return {
    // state & setters
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
    loading, error,
    showRecurringOptions,
    toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays, handleDayToggle,
    showAdditionalOptions, toggleAdditionalOptions,
    arrivalTime, driveTime,
    isEditing, isRecurringParent, isRecurringInstance,
    editMode, setEditMode,
    assignableFamilyMembers, driverHelperFamilyMembers,
    getDisplayName, getDayLetter, getSelectedDaysSummary,
    handleSave: handleSaveInternal,
    handleDelete: handleDeleteInternal,
    onClose,
    onSave,
    onDelete,
  }
}