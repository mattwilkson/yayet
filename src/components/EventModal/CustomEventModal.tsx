// File: src/components/EventModal/CustomEventModal.tsx
import React from 'react'
import { EventModalUI } from './EventModalUI'
import { useEventModalLogic } from '../../hooks/useEventModalLogic'

export function CustomEventModal(props: {
  isOpen: boolean
  onClose: () => void
  onSave: () => void   // Dashboard refresh
  onDelete: () => void // Dashboard after-delete
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
}) {
  const logic = useEventModalLogic(props)
  // spread props *and* logic so UI sees both onSave/onDelete (dashboard)
  // and handleSave/handleDelete (hook)
  return <EventModalUI {...props} {...logic} />
}