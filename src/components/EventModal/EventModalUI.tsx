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

  showAdditionalOptions?: boolean
  toggleAdditionalOptions?: () => void
  arrivalTime?: string
  setArrivalTime?: (value: string) => void
  driveTime?: string
  setDriveTime?: (value: string) => void

  isEditing?: boolean
  isRecurringParent?: boolean
  isRecurringInstance?: boolean
  editMode?: 'single' | 'all'
  setEditMode?: (value: 'single' | 'all') => void

  assignableFamilyMembers?: any[]
  driverHelperFamilyMembers?: any[]

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
  const formatSafely = (dateStr: string, timeStr: string) => {
    try {
      const dt = parseISO(`${dateStr}T${timeStr}`)
      if (isValid(dt)) {
        return format(dt, 'PPpp')
      }
      return 'Invalid date'
    } catch {
      return 'Invalid date'
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Event' : 'Create Event'} size="lg">
      <div className="p-6 space-y-6">
        {/* Basic Event Details */}
        <div className="space-y-4">
          <Input label="Title *" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter event title" required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" disabled={allDay} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" disabled={allDay} required />
            </div>
          </div>
          <div>
            <label className="flex items-center">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-2 text-sm text-gray-700">All day event</span>
            </label>
          </div>
          <Input label="Location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Enter location (optional)" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter description (optional)" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"></textarea>
          </div>
        </div>
        {/* Recurring Event Options */}
        <div>
          <button type="button" onClick={toggleRecurringOptions} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
            {showRecurringOptions ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}<Repeat className="h-4 w-4 mr-1" />Make this a recurring event
          </button>
          {showRecurringOptions && (
            <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Recurrence Pattern</label>
                <select value={recurrenceType} onChange={e => setRecurrenceType?.(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="none">None</optiione>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Repeat every</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={recurrenceInterval} onChange={e => setRecurrenceInterval?.(parseInt(e.target.value, 10))} className="w-16 rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  <span className="text-sm text-blue-700">{recurrenceType === 'daily' && 'day(s)'}{recurrenceType === 'weekly' && 'week(s)'}{recurrenceType === 'monthly' && 'month(s)'}{recurrenceType === 'yearly' && 'year(s)'}
                  </span>
                </div>
              </div>
              {recurrenceType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">Repeat on these days:</label>
                  <div className="flex flex-wrap gap-2">
                    {['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].map(day => (
                      <button key={day} type="button" onClick={() => handleDayToggle?.(day)} className={`w-10 h-10 rounded-full text-sm font-medium flex items-center justify-center ${selectedDays.includes(day) ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-300'}`}>
                        {getDayLetter?.(day)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="radio" name="recurrenceEnd" checked={recurrenceEndType === 'count'} onChange={() => setRecurrenceEndType?.('count')} className="h-4 w-4 text-blue-600" />
                  <span className="ml-2 text-sm text-blue-700">After</span>
                </label>
                {recurrenceEndType === 'count' && (
                  <input type="number" min={1} value={recurrenceEndCount} onChange={e => setRecurrenceEndCount?.(parseInt(e.target.value,10))} className="w-20 rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                )}
                <label className="flex items-center">
                  <input type="radio" name="recurrenceEnd" checked={recurrenceEndType === 'until'} onChange={() => setRecurrenceEndType?.('until')} className="h-4 w-4 text-blue-600" />
                  <span className="ml-2 text-sm text-blue-700">Until</span>
                </label>
                {recurrenceEndType === 'until' && (
                  <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate?.(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                )}
              </div>
            </div>
          )}
        </div>
        {/* Additional Scheduling Tools */}
        <div>
          <button type="button" onClick={toggleAdditionalOptions} className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
            {showAdditionalOptions ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}Additional Scheduling Tools
          </button>
          {showAdditionalOptions && (
            <div className="mt-3 space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">What time do you need to be there?</label>
                <div className="flex items-center gap-2">
                  <input type="time" value={arrivalTime} onChange={e => setArrivalTime?.(e.target.value)} className="rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  <span className="text-xs text-blue-600">Creates an "Arrival" event before the main event</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">How long is the drive? (minutes)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={180} value={driveTime} onChange={e => setDriveTime?.(e.target.value)} className="w-24 rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  <span className="text-xs text-blue-600">Creates a 🚗 “Drive Time” event before arrival/start time</span>
                </div>
                <ul className="mt-2 list-disc list-inside text-xs text-gray-600">
                  <li><strong>Arrival Time:</strong> Event slot between arrival & start.</li>
                  <li><strong>Drive Time:</strong> Separate 🚗 event before your arrival.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        {/* Assign Family Members */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Assign Family Members</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {assignableFamilyMembers.length === 0 ? (
                <p className="text-sm text-gray-500">No family members available</p>
              ) : (
                assignableFamilyMembers.map(member => (
                  <label key={member.id} className="flex items-center">
                    <input type="checkbox" checked={assignedMembers.includes(member.id)} onChange={e => e.target.checked ? setAssignedMembers([...assignedMembers, member.id]) : setAssignedMembers(assignedMembers.filter(id => id !== member.id))} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <div className="ml-2 flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: member.color }} />
                      <span className="text-sm text-gray-700">{getDisplayName(member)}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Driver/Helper Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Who is driving/helping?</h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <select value={driverHelper} onChange={e => setDriverHelper(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option value="">Select driver/helper (optional)</option>
              {driverHelperFamilyMembers.map(member => (
                <option key={member.id} value={member.id}>{getDisplayName(member)}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Eligible drivers/helpers: Immediate family members over 16, all extended family members, and caregivers.</p>
          </div>
        </div>
        {/* Error Message */}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div>
            {isEditing && <Button variant="danger" onClick={onDelete} disabled={loading}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} disabled={loading}><X className="h-4 w-4 mr-2" />Cancel</Button>
            <Button onClick={onSave} disabled={loading} loading={loading}><Save className="h-4 w-4 mr-2" />{isEditing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}