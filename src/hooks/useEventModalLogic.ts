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
  // safe-guard assignments
  const safeAssignments = event.event_assignments ?? []

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

  /* ...rest of your existing state/hooks... */

  // initialize when modal opens or event changes
  useEffect(() => {
    if (!isOpen) return

    /* your existing initialization logic… */

    // pull assignments from safeAssignments
    const assigns = safeAssignments as { family_member_id: string; is_driver_helper: boolean }[]
    setAssignedMembers(
      assigns.filter(a => !a.is_driver_helper).map(a => a.family_member_id)
    )
    const driver = assigns.find(a => a.is_driver_helper)
    setDriverHelper(driver?.family_member_id || '')
  }, [isOpen, event])

  /* …your existing QoL #3 hooks, save/delete handlers, etc… */

  return {
    isOpen,
    onClose,
    handleSave,
    handleDelete,
    loading,
    error,
    /* …all your other returned values… */
  }
}