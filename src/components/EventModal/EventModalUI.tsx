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
  AlertCircle,
  Check
} from 'lucide-react'

export interface EventModalUIProps {
  // control
  isOpen: boolean
  onClose: () => void
  onSave: () => Promise<void>
  onDelete: () => Promise<void>
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
        {/* Recurring edit mode toggle */}
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
            </div>
          </div>
        )}

        {/* Title */}
        <Input
          label="Title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter event title"
          required
        />

        {/* Dates & Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date *</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time *</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
              disabled={allDay}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Time *</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="mt-1 w-full rounded-lg border-gray-300"
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
            className="h-4 w-4 text-blue-600"
          />
          <span className="ml-2 text-sm text-gray-700">All day event</span>
        </label>

        {/* Recurrence Options */}
        {!isRecurringInstance && !isEditing && (
          <div>
            <button
              onClick={toggleRecurringOptions}
              className="flex items-center text-sm text-blue-600"
            >
              {showRecurringOptions ? <ChevronUp /> : <ChevronDown />}
              <Repeat className="ml-1 mr-2" /> Make this a recurring event
            </button>
            {showRecurringOptions && (
              <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                <div>
                  <label className="block text-sm text-blue-700">Pattern</label>
                  <select
                    value={recurrenceType}
                    onChange={e => setRecurrenceType(e.target.value)}
                    className="mt-1 w-full rounded-lg border-blue-300"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                {/* If weekly: day toggles */}
                {recurrenceType === 'weekly' && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDayToggle(d)}
                          className={`px-3 py-1 rounded ${
                            selectedDays.includes(d)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border'
                          }`}
                        >
                          {d[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-sm text-blue-700">
                      Selected: {getSelectedDaysSummary()}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-blue-700">End</label>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="recEnd"
                        checked={recurrenceEndType === 'count'}
                        onChange={() => setRecurrenceEndType('count')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm">After</span>
                      <Input
                        type="number"
                        value={recurrenceEndCount}
                        onChange={v => setRecurrenceEndCount(Number(v))}
                        className="w-16 mx-2"
                      />
                      <span>occurrences</span>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="recEnd"
                        checked={recurrenceEndType === 'date'}
                        onChange={() => setRecurrenceEndType('date')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm">On</span>
                      <input
                        type="date"
                        value={recurrenceEndDate}
                        onChange={e => setRecurrenceEndDate(e.target.value)}
                        className="ml-2 rounded-lg border-blue-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Additional Scheduling Tools */}
        <div>
          <button
            onClick={toggleAdditionalOptions}
            className="flex items-center text-sm text-blue-600"
          >
            {showAdditionalOptions ? <ChevronUp /> : <ChevronDown />}
            <Car className="ml-1 mr-2" /> Additional Tools
          </button>
          {showAdditionalOptions && (
            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
              <div>
                <label className="block text-sm text-blue-700">Arrival Time</label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  className="mt-1 rounded-lg border-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-blue-700">Drive Time (min)</label>
                <input
                  type="number"
                  value={driveTime}
                  onChange={e => setDriveTime(e.target.value)}
                  className="mt-1 rounded-lg border-blue-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <Input
          label="Location"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="(optional)"
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border-gray-300"
            placeholder="Enter description"
          />
        </div>

        {/* Assign Family Members */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Users className="mr-2" /> Assign Family Members
          </h3>
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
            {assignableFamilyMembers.map(member => (
              <label key={member.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={assignedMembers.includes(member.id)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...assignedMembers, member.id]
                      : assignedMembers.filter(id => id !== member.id)
                    setAssignedMembers(next)
                  }}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="flex items-center space-x-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <span>{getDisplayName(member)}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Driver / Helper */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Car className="mr-2" /> Driver / Helper
          </h3>
          <Select
            placeholder="(Optional)"
            value={driverHelper}
            onChange={v => setDriverHelper(v)}
            options={[
              { label: '(None)', value: '' },
              ...driverHelperFamilyMembers.map(m => ({
                label: getDisplayName(m),
                value: m.id
              }))
            ]}
          />
          <p className="text-xs text-gray-500 mt-1">
            Immediate family ≥16, all extended & caregivers
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t flex justify-between">
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={loading}
          >
            <Trash2 className="mr-2" /> Delete
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X className="mr-2" /> Cancel
            </Button>
            <Button onClick={onSave} disabled={loading} loading={loading}>
              <Save className="mr-2" /> {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}