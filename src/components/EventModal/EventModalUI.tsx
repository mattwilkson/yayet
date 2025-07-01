import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Save, Trash2, X, ChevronUp, ChevronDown, Repeat } from 'lucide-react'

interface EventModalUIProps {
  isOpen: boolean
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  location: string
  assignedMembers: string[]
  driverHelper: string
  loading: boolean
  error: string
  onClose: () => void
  onSave: () => void
  onDelete: () => void
  setTitle: (value: string) => void
  setDescription: (value: string) => void
  setStartDate: (value: string) => void
  setStartTime: (value: string) => void
  setEndDate: (value: string) => void
  setEndTime: (value: string) => void
  setAllDay: (value: boolean) => void
  setLocation: (value: string) => void
  setAssignedMembers: (value: string[]) => void
  setDriverHelper: (value: string) => void

  // Optional props for recurring events
  showRecurringOptions?: boolean
  toggleRecurringOptions?: () => void
  recurrenceType?: string
  setRecurrenceType?: (value: any) => void
  recurrenceInterval?: number
  setRecurrenceInterval?: (value: number) => void
  recurrenceEndType?: string
  setRecurrenceEndType?: (value: any) => void
  recurrenceEndCount?: number
  setRecurrenceEndCount?: (value: number) => void
  recurrenceEndDate?: string
  setRecurrenceEndDate?: (value: string) => void
  selectedDays?: string[]
  handleDayToggle?: (day: string) => void

  // Optional props for additional options
  showAdditionalOptions?: boolean
  toggleAdditionalOptions?: () => void
  arrivalTime?: string
  setArrivalTime?: (value: string) => void
  driveTime?: string
  setDriveTime?: (value: string) => void

  // Optional props for recurring event editing (not rendered here)
  isEditing?: boolean
  isRecurringParent?: boolean
  isRecurringInstance?: boolean
  editMode?: 'single' | 'all'
  setEditMode?: (value: 'single' | 'all') => void

  // Family members data
  assignableFamilyMembers?: any[]
  driverHelperFamilyMembers?: any[]

  // Helper functions
  getDisplayName?: (member: any) => string
  getDayLetter?: (day: string) => string
  getSelectedDaysSummary?: () => string
}

export function EventModalUI({
  isOpen,
  title,
  description,
  startDate,
  startTime,
  endDate,
  endTime,
  allDay,
  location,
  assignedMembers,
  driverHelper,
  loading,
  error,
  onClose,
  onSave,
  onDelete,
  setTitle,
  setDescription,
  setStartDate,
  setStartTime,
  setEndDate,
  setEndTime,
  setAllDay,
  setLocation,
  setAssignedMembers,
  setDriverHelper,

  // Optional props with defaults
  showRecurringOptions = false,
  toggleRecurringOptions = () => {},
  recurrenceType = 'none',
  setRecurrenceType = () => {},
  recurrenceInterval = 1,
  setRecurrenceInterval = () => {},
  recurrenceEndType = 'count',
  setRecurrenceEndType = () => {},
  recurrenceEndCount = 10,
  setRecurrenceEndCount = () => {},
  recurrenceEndDate = '',
  setRecurrenceEndDate = () => {},
  selectedDays = [],
  handleDayToggle = () => {},

  showAdditionalOptions = false,
  toggleAdditionalOptions = () => {},
  arrivalTime = '',
  setArrivalTime = () => {},
  driveTime = '',
  setDriveTime = () => {},

  isEditing = false,
  isRecurringParent = false,
  isRecurringInstance = false,
  editMode = 'single',
  setEditMode = () => {},

  assignableFamilyMembers = [],
  driverHelperFamilyMembers = [],

  getDisplayName = (m) => m.name,
  getDayLetter = (d) => d.charAt(0).toUpperCase(),
  getSelectedDaysSummary = () => 'No days selected'
}: EventModalUIProps) {
  // Safely format dates for display
  const formatSafely = (dateStr: string, timeStr: string) => {
    try {
      const dt = parseISO(`${dateStr}T${timeStr}`)
      if (isValid(dt)) {
        return format(dt, 'PPpp')
      }
      return 'Invalid date'
    } catch (error) {
      console.error('Date formatting error:', error, { dateStr, timeStr })
      return 'Invalid date'
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Event' : 'Create Event'} size="lg">
      <div className="p-6 space-y-6">
        {/* Basic Event Details */}
        <div className="space-y-4">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter event title"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                disabled={allDay}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                disabled={allDay}
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700">All day event</span>
            </label>
          </div>

          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter location (optional)"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Recurring Event Options */}
        <div>
          <button
            type="button"
            onClick={toggleRecurringOptions}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showRecurringOptions ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}<Repeat className="h-4 w-4 mr-1" />Make this a recurring event
          </button>
          {showRecurringOptions && (
            <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Recurrence Pattern</label>
                <select
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType?.(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Repeat every</label>```