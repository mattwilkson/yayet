// File: components/EventModal/CustomEventModal.tsx
import React from 'react'
import { EventModalUI } from './EventModalUI'
import { useEventModalLogic } from '../../hooks/useEventModalLogic'

export function CustomEventModal(props: {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
  event: any
  familyMembers: any[]
  familyId: string
  userId: string
}) {
  const logic = useEventModalLogic(props)
  return <EventModalUI {...logic} />
}