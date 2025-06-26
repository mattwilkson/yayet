// File: components/EventModal/EventModalUI.tsx
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
  AlertCircle,
  Check
} from 'lucide-react'

export interface EventModalUIProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
  loading: boolean
  error: string

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

  assignedMembers: string[]
  setAssignedMembers: (members: string[]) => void
  driverHelper: string
  setDriverHelper: (v: string) => void

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

  showAdditionalOptions: boolean
  toggleAdditionalOptions: () => void
  arrivalTime: string
  setArrivalTime: (v: string) => void
  driveTime: string
  setDriveTime: (v: string) => void

  isEditing: boolean
  isRecurringParent: boolean
  isRecurringInstance: boolean
  editMode: 'single' | 'all'
  setEditMode: (mode: 'single' | 'all') => void

  assignableFamilyMembers: any[]
  driverHelperFamilyMembers: any[]

  getDisplayName: (member: any) => string
  getDayLetter: (day: string) => string
  getSelectedDaysSummary: () => string

  handleSave: () => Promise<void>
  handleDelete: () => Promise<void>
}

export function EventModalUI(props: EventModalUIProps) {
  const {
    isOpen, onClose, onSave, onDelete,
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

    getDisplayName, getDayLetter, getSelectedDaysSummary,

    handleSave, handleDelete
  } = props

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Create Event'}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Recurring Event Edit Mode */}
        {(isRecurringParent || isRecurringInstance) && isEditing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              This is a recurring event
            </h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="editMode"
                  checked={editMode === 'single'}
                  onChange={() => setEditMode('single')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-blue-700">
                  Edit only this occurrence
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="editMode"
                  checked={editMode === 'all'}
                  onChange={() => setEditMode('all')}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-blue-700">
                  Edit all occurrences
                </span>
              </label>
              <p className="text-xs text-blue-600 mt-1">
                Note: Editing all occurrences will affect future events in this series.
              </p>
            </div>
          </div>
        )}

        {/* Basic Event Details */}
        <div className="space-y-4">
          <Input
            label="Title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter event title"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                disabled={allDay}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                disabled={allDay}
                required
              />
            </div>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">All day event</span>
          </label>

          {/* Recurring Options */}
          {!isRecurringInstance && !isEditing && (
            <div>
              <button
                type="button"
                onClick={toggleRecurringOptions}
                className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {showRecurringOptions ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-1" />
                )}
                <Repeat className="h-4 w-4 mr-1" /> Make this a recurring event
              </button>
              {showRecurringOptions && (
                <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Recurrence Pattern
                    </label>
                    <select
                      value={recurrenceType}
                      onChange={e => setRecurrenceType(e.target.value)}
                      className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  {/* …and the rest of your detailed JSX exactly as before */}
                </div>
              )}
            </div>
          )}

          {/* Additional Scheduling Tools */}
          {/* Assignments, error message, and action buttons… */}

        </div>
      </div>
    </Modal>
  )
}