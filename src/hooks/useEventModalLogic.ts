// File: src/components/EventModal/EventModalUI.tsx
import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Save,
  X,
  Trash2,
  Repeat,
  ChevronDown,
  ChevronUp,
  Car,
} from 'lucide-react'

export interface EventModalUIProps {
  // control
  isOpen: boolean
  onClose: () => void

  // these are the logic handlers now:
  handleSave: () => Promise<void>
  handleDelete: () => Promise<void>

  loading: boolean
  error: string

  // basic fields
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void

  startDate: string
  setStartDate: (v: string) => void
  startTime: string
  setStartTime: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  endTime: string
  setEndTime: (v: string) => void

  allDay: boolean
  setAllDay: (v: boolean) => void

  location: string
  setLocation: (v: string) => void

  // assignments
  assignedMembers: string[]
  setAssignedMembers: (members: string[]) => void
  driverHelper: string
  setDriverHelper: (v: string) => void

  // recurrence
  showRecurringOptions: boolean
  toggleRecurringOptions: () => void
  recurrenceType: string
  setRecurrenceType: (v: string) => void
  recurrenceInterval: number
  setRecurrenceInterval: (v: number) => void
  recurrenceEndDate: string
  setRecurrenceEndDate: (v: string) => void
  recurrenceEndCount: number
  setRecurrenceEndCount: (v: number) => void
  recurrenceEndType: string
  setRecurrenceEndType: (v: string) => void
  selectedDays: string[]
  handleDayToggle: (day: string) => void

  // additional tools
  showAdditionalOptions: boolean
  toggleAdditionalOptions: () => void
  arrivalTime: string
  setArrivalTime: (v: string) => void
  driveTime: string
  setDriveTime: (v: string) => void

  // editing flags
  isEditing: boolean
  isRecurringParent: boolean
  isRecurringInstance: boolean
  editMode: 'single' | 'all'
  setEditMode: (mode: 'single' | 'all') => void

  // filtered lists
  assignableFamilyMembers: any[]
  driverHelperFamilyMembers: any[]

  // utils
  getDisplayName: (m: any) => string
  getDayLetter: (d: string) => string
  getSelectedDaysSummary: () => string
}

export function EventModalUI(props: EventModalUIProps) {
  const {
    isOpen, onClose,
    handleSave, handleDelete,
    loading, error,

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

    showRecurringOptions, toggleRecurringOptions,
    recurrenceType, setRecurrenceType,
    recurrenceInterval, setRecurrenceInterval,
    recurrenceEndDate, setRecurrenceEndDate,
    recurrenceEndCount, setRecurrenceEndCount,
    recurrenceEndType, setRecurrenceEndType,
    selectedDays, handleDayToggle,

    showAdditionalOptions, toggleAdditionalOptions,
    arrivalTime, setArrivalTime,
    driveTime, setDriveTime,

    isEditing, isRecurringParent, isRecurringInstance,
    editMode, setEditMode,

    assignableFamilyMembers, driverHelperFamilyMembers,

    getDisplayName, getDayLetter, getSelectedDaysSummary
  } = props

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Create Event'}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* ... all of your fields and sections stay exactly the same ... */}

        {/* Actions */}
        <div className="pt-4 border-t flex justify-between">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="mr-2" /> Delete
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X className="mr-2" /> Cancel
            </Button>
            {/* ⚠️ switched from onSave prop to logic.handleSave */}
            <Button onClick={handleSave} disabled={loading} loading={loading}>
              <Save className="mr-2" /> {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}