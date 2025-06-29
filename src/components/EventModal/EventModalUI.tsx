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

  handleSave: () => Promise<void>
  handleDelete: () => Promise<void>
}

export function EventModalUI(props: EventModalUIProps) {
  const {
    isOpen, onClose, handleSave, handleDelete,
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
                Note: Editing all occurrences will affect future events.
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
            placeholder="Event title"
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
                className="w-full rounded-lg border px-3 py-2"
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
                className="w-full rounded-lg border px-3 py-2"
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
                disabled={allDay}
                className="w-full rounded-lg border px-3 py-2"
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
                disabled={allDay}
                className="w-full rounded-lg border px-3 py-2"
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
            <span className="ml-2 text-sm">All-day event</span>
          </label>

          {/* Recurring Options Toggle */}
          {!isRecurringInstance && !isEditing && (
            <div>
              <button
                type="button"
                onClick={toggleRecurringOptions}
                className="flex items-center text-blue-600"
              >
                {showRecurringOptions ? <ChevronUp /> : <ChevronDown />}
                <Repeat className="ml-1" /> Recurring
              </button>

              {showRecurringOptions && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-2 space-y-4">
                  {/* Pattern */}
                  <div>
                    <label className="block text-sm text-blue-700 mb-1">
                      Pattern
                    </label>
                    <select
                      value={recurrenceType}
                      onChange={e => setRecurrenceType(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
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
                      <label className="block text-sm text-blue-700 mb-1">
                        Repeat every
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={recurrenceInterval}
                          onChange={e => setRecurrenceInterval(+e.target.value)}
                          className="w-16 rounded-lg border px-3 py-2"
                        />
                        <span className="text-sm">
                          {recurrenceType}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Weekly days */}
                  {recurrenceType === 'weekly' && (
                    <div>
                      <label className="block text-sm text-blue-700 mb-1">
                        On:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleDayToggle(d)}
                            className={`w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center ${
                              selectedDays.includes(d)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border'
                            }`}
                          >
                            {selectedDays.includes(d) ? <Check size={16}/> : d.charAt(0).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End after/count or date */}
                  {recurrenceType !== 'none' && (
                    <div>
                      <label className="block text-sm text-blue-700 mb-1">
                        Ends
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            checked={recurrenceEndType === 'count'}
                            onChange={() => setRecurrenceEndType('count')}
                          />
                          After
                          <input
                            type="number"
                            min={1}
                            value={recurrenceEndCount}
                            onChange={e => setRecurrenceEndCount(+e.target.value)}
                            disabled={recurrenceEndType !== 'count'}
                            className="w-16 rounded-lg border px-2 py-1"
                          />
                          occurrences
                        </label>

                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            checked={recurrenceEndType === 'date'}
                            onChange={() => setRecurrenceEndType('date')}
                          />
                          On
                          <input
                            type="date"
                            value={recurrenceEndDate}
                            onChange={e => setRecurrenceEndDate(e.target.value)}
                            disabled={recurrenceEndType !== 'date'}
                            className="rounded-lg border px-2 py-1"
                          />
                        </label>
                      </div>
                    </div>
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
              className="flex items-center text-blue-600"
            >
              {showAdditionalOptions ? <ChevronUp /> : <ChevronDown />}
              <Car className="ml-1" /> Additional
            </button>

            {showAdditionalOptions && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-2 space-y-4">
                <div>
                  <label className="block text-sm text-blue-700 mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={e => setArrivalTime(e.target.value)}
                    className="rounded-lg border px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-blue-700 mb-1">
                    Drive Duration (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={driveTime}
                    onChange={e => setDriveTime(e.target.value)}
                    className="rounded-lg border px-3 py-2 w-24"
                  />
                </div>

                <div className="bg-blue-100 p-3 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                  <AlertCircle size={16}/>
                  <div>
                    <p><strong>How it works:</strong></p>
                    <ul className="list-disc pl-5">
                      <li>“Arrival” creates an event between arrival and start</li>
                      <li>“Drive” creates a 🚗 event before arrival/start</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <Input
            label="Location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="(Optional)"
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border px-3 py-2"
              placeholder="(Optional)"
            />
          </div>
        </div>

        {/* Assign Family Members */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Users size={16} className="mr-1"/> Assign Family
          </h3>
          <div className="bg-gray-50 border p-4 rounded-lg max-h-40 overflow-y-auto space-y-2">
            {assignableFamilyMembers.length === 0 ? (
              <p className="text-gray-500 text-sm">No members</p>
            ) : assignableFamilyMembers.map(m => (
              <label key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={assignedMembers.includes(m.id)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...assignedMembers, m.id]
                      : assignedMembers.filter(x => x !== m.id)
                    setAssignedMembers(next)
                  }}
                  className="h-4 w-4 text-blue-600"
                />
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: m.color}}/>
                <span className="text-gray-700 text-sm">{getDisplayName(m)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Driver/Helper */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Car size={16} className="mr-1"/> Driver / Helper
          </h3>
          <Select
            value={driverHelper}
            onChange={e => setDriverHelper(e.target.value)}
          >
            <option value="">(Optional)</option>
            {driverHelperFamilyMembers.map(m => (
              <option key={m.id} value={m.id}>{getDisplayName(m)}</option>
            ))}
          </Select>
          <p className="text-xs text-gray-500">
            Immediate family ≥16, all extended & caregivers
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {isEditing && (
              <Button variant="danger" onClick={handleDelete} disabled={loading}>
                <Trash2 size={16} className="mr-1"/> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X size={16} className="mr-1"/> Cancel
            </Button>
            <Button onClick={handleSave} loading={loading}>
              <Save size={16} className="mr-1"/> {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}