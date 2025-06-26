// File: src/hooks/useEventModalLogic.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, addHours, parseISO, isValid } from 'date-fns'

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
  // --- all your state variables ---
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

  // … your useEffects and helper functions …
  // (copy in the getInitialDateTime, parsing, CRUD logic, etc.)

  // For brevity, I’m assuming you’ve copied everything above exactly as you posted,
  // including handleSave and handleDelete implementations.

  return {
    // modal control
    isOpen,
    onClose,

    // loading & error
    loading,
    error,

    // basic event fields
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
    showRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays,

    // additional tools
    showAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,

    // editing/recurrence flags
    isEditing,
    isRecurringParent,
    isRecurringInstance,
    editMode, setEditMode,

    // computed lists
    assignableFamilyMembers: familyMembers.filter(m => m.category === 'immediate_family'),
    driverHelperFamilyMembers: familyMembers.filter(/* same filter you had */),

    // handlers (renamed to match UI props)
    onSave: handleSave,
    onDelete: handleDelete,
    toggleRecurringOptions,
    toggleAdditionalOptions,
    handleDayToggle,

    // helpers
    getDisplayName,
    getDayLetter,
    getSelectedDaysSummary
  }
}