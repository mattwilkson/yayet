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
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
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

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
          <Input
            label="End Date *"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Time *"
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            disabled={allDay}
            required
          />
          <Input
            label="End Time *"
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            disabled={allDay}
            required
          />
        </div>

        {/* All Day */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={allDay}
            onChange={e => setAllDay(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">All day event</span>
        </label>

        {/* Recurrence */}
        {!isRecurringInstance && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleRecurringOptions}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {showRecurringOptions ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              <Repeat className="h-4 w-4 mr-1" />
              {showRecurringOptions ? 'Hide' : 'Make'} Recurring Options
            </button>
            {showRecurringOptions && (
              <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                {/* Pattern */}
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">Pattern</label>
                  <select
                    value={recurrenceType}
                    onChange={e => setRecurrenceType(e.target.value)}
                    className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Interval */}
                {recurrenceType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Repeat every</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        value={recurrenceInterval}
                        onChange={e => setRecurrenceInterval(Number(e.target.value))}
                        className="w-16 rounded-lg border border-blue-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-blue-700">
                        {recurrenceType === 'daily' ? 'day(s)' :
                         recurrenceType === 'weekly' ? 'week(s)' :
                         recurrenceType === 'monthly' ? 'month(s)' :
                         'year(s)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Weekly days */}
                {recurrenceType === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">On these days:</label>
                    <div className="flex flex-wrap gap-2">
                      {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleDayToggle(d)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            selectedDays.includes(d)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-blue-700 border border-blue-300'
                          }`}
                        >
                          {selectedDays.includes(d) ? <Check className="w-4 h-4" /> : d.charAt(0).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* End condition */}
                {recurrenceType !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">End</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="recurrenceEnd"
                          checked={recurrenceEndType === 'count'}
                          onChange={() => setRecurrenceEndType('count')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2 text-sm text-blue-700">After</span>
                        <input
                          type="number"
                          min={1}
                          value={recurrenceEndCount}
                          onChange={e => setRecurrenceEndCount(Number(e.target.value))}
                          disabled={recurrenceEndType !== 'count'}
                          className="ml-2 w-16 rounded-lg border border-blue-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="ml-2 text-sm text-blue-700">occurrence(s)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="recurrenceEnd"
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
                          className="ml-2 rounded-lg border border-blue-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {recurrenceType !== 'none' && (
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      {recurrenceType === 'daily' && `Repeats every ${recurrenceInterval} day(s)`}
                      {recurrenceType === 'weekly' && `Repeats every ${recurrenceInterval} week(s) on ${getSelectedDaysSummary()}`}
                      {recurrenceType === 'monthly' && `Repeats every ${recurrenceInterval} month(s)`}
                      {recurrenceType === 'yearly' && `Repeats every ${recurrenceInterval} year(s)`}
                      {recurrenceEndType === 'count' && `, ${recurrenceEndCount} times`}
                      {recurrenceEndType === 'date' && `, until ${recurrenceEndDate}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Additional Scheduling Tools */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={toggleAdditionalOptions}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showAdditionalOptions ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            <Car className="h-4 w-4 mr-1" /> Additional Tools
          </button>
          {showAdditionalOptions && (
            <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Arrival Time</label>
                <Input
                  type="time"
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                />
                <p className="text-xs text-blue-600 mt-1">Creates an “arrival” event before start</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Drive Time (min)</label>
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={driveTime}
                  onChange={e => setDriveTime(e.target.value)}
                />
                <p className="text-xs text-blue-600 mt-1">Creates a 🚗 event before arrival/start</p>
              </div>
              <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded-lg">
                <div className="flex items-center mb-1">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  <span className="font-medium">How this works:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Arrival time event</li>
                  <li>Drive time event</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <Input
          label="Location"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Enter location (optional)"
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter description (optional)"
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Assign Family Members */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Users className="h-4 w-4 mr-2" /> Assign Family Members
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            {assignableFamilyMembers.length > 0 ? (
              assignableFamilyMembers.map(m => (
                <label key={m.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={assignedMembers.includes(m.id)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...assignedMembers, m.id]
                        : assignedMembers.filter(id => id !== m.id)
                      props.setAssignedMembers(next)
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{getDisplayName(m)}</span>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">No family members available</p>
            )}
          </div>
        </div>

        {/* Driver/Helper */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Car className="h-4 w-4 mr-2" /> Driver / Helper
          </h3>
          <Select
            value={driverHelper}
            onChange={val => setDriverHelper(val)}
            options={[
              { value: '', label: '(Optional)' },
              ...driverHelperFamilyMembers.map(m => ({
                value: m.id,
                label: getDisplayName(m)
              }))
            ]}
          />
          <p className="text-xs text-gray-500 mt-1">
            Immediate family ≥16, all extended & caregivers
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {isEditing && (
              <Button variant="danger" onClick={onDelete} disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={onSave} loading={loading} disabled={loading}>
              <Save className="h-4 w-4 mr-2" /> {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}