// File: src/components/EventModal/EventModalUI.tsx
import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
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

  onSave: () => Promise<void>
  onDelete: () => Promise<void>
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
            {/* Start Date */}
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
            {/* End Date */}
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
            {/* Start Time */}
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
            {/* End Time */}
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

          {/* All Day */}
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
                  {/* Pattern */}
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

                  {/* Interval, Days, End */}
                  {recurrenceType !== 'none' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Repeat every
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min={1}
                            value={recurrenceInterval}
                            onChange={e => setRecurrenceInterval(+e.target.value)}
                            className="w-16 rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <span className="ml-2 text-sm text-blue-700">
                            {recurrenceType === 'daily' && 'day(s)'}
                            {recurrenceType === 'weekly' && 'week(s)'}
                            {recurrenceType === 'monthly' && 'month(s)'}
                            {recurrenceType === 'yearly' && 'year(s)'}
                          </span>
                        </div>
                      </div>

                      {recurrenceType === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-blue-700 mb-2">
                            Repeat on these days:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(day => (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleDayToggle(day)}
                                className={`w-10 h-10 rounded-full text-sm font-medium flex items-center justify-center ${
                                  selectedDays.includes(day)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-blue-700 border border-blue-300'
                                }`}
                              >
                                {selectedDays.includes(day) ? <Check className="h-4 w-4" /> : day[0].toUpperCase()}
                              </button>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-blue-700">
                            Selected: {getSelectedDaysSummary()}
                          </p>
                        </div>
                      )}

                      {/* End after count or date */}
                      <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                          Ends
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={recurrenceEndType === 'count'}
                              onChange={() => setRecurrenceEndType('count')}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-blue-700">After</span>
                            <input
                              type="number"
                              min={1}
                              value={recurrenceEndCount}
                              onChange={e => setRecurrenceEndCount(+e.target.value)}
                              disabled={recurrenceEndType !== 'count'}
                              className="ml-2 w-16 rounded-lg border border-blue-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <span className="ml-2 text-sm text-blue-700">occurrences</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              checked={recurrenceEndType === 'date'}
                              onChange={() => setRecurrenceEndType('date')}
                              className="h-4 w-4 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-blue-700">On date</span>
                            <input
                              type="date"
                              value={recurrenceEndDate}
                              onChange={e => setRecurrenceEndDate(e.target.value)}
                              disabled={recurrenceEndType !== 'date'}
                              className="ml-2 rounded-lg border border-blue-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional Scheduling Tools */}
          <div>
            <button
              type="button"
              onClick={toggleAdditionalOptions}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {showAdditionalOptions ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              <Car className="h-4 w-4 mr-1" /> Additional Tools
            </button>
            {showAdditionalOptions && (
              <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Arrival time
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={e => setArrivalTime(e.target.value)}
                    className="rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-xs text-blue-600 mt-1">Will create an “Arrival” event</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Drive time (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={driveTime}
                    onChange={e => setDriveTime(e.target.value)}
                    className="rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-24"
                  />
                  <p className="text-xs text-blue-600 mt-1">Will create a 🚗 event</p>
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Enter location (optional)"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Assign Family Members */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Users className="h-4 w-4 mr-1"/> Assign Family Members
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {assignableFamilyMembers.map(m => (
              <label key={m.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={assignedMembers.includes(m.id)}
                  onChange={e => {
                    if (e.target.checked) setAssignedMembers([...assignedMembers, m.id])
                    else setAssignedMembers(assignedMembers.filter(id => id !== m.id))
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <span className="text-sm">{getDisplayName(m)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Driver/Helper */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Car className="h-4 w-4 mr-1"/> Driver / Helper
          </h3>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            value={driverHelper}
            onChange={e => setDriverHelper(e.target.value)}
          >
            <option value="">(Optional)</option>
            {driverHelperFamilyMembers.map(m => (
              <option key={m.id} value={m.id}>
                {getDisplayName(m)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Immediate family ≥16, all extended & caregivers
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {isEditing && (
              <Button variant="danger" onClick={onDelete} disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2"/> Delete
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4 mr-1"/> Cancel
            </Button>
            <Button onClick={onSave} disabled={loading} loading={loading}>
              <Save className="h-4 w-4 mr-1"/> {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}