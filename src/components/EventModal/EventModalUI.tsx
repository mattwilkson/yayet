import React from 'react'
import { Button } from '../ui/Button'
import { format, isValid } from 'date-fns'

interface EventModalUIProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
  loading: boolean
  error: string
  
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
  
  startDate: string
  setStartDate: (value: string) => void
  startTime: string
  setStartTime: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  endTime: string
  setEndTime: (value: string) => void
  
  allDay: boolean
  setAllDay: (value: boolean) => void
  
  location: string
  setLocation: (value: string) => void
  
  assignedMembers: string[]
  setAssignedMembers: (value: string[]) => void
  driverHelper: string
  setDriverHelper: (value: string) => void
  
  showRecurringOptions: boolean
  toggleRecurringOptions: () => void
  recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  setRecurrenceType: (value: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly') => void
  recurrenceInterval: number
  setRecurrenceInterval: (value: number) => void
  recurrenceEndDate: string
  setRecurrenceEndDate: (value: string) => void
  recurrenceEndCount: number
  setRecurrenceEndCount: (value: number) => void
  recurrenceEndType: 'count' | 'date'
  setRecurrenceEndType: (value: 'count' | 'date') => void
  selectedDays: string[]
  handleDayToggle: (day: string) => void
  
  showAdditionalOptions: boolean
  toggleAdditionalOptions: () => void
  arrivalTime: string
  setArrivalTime: (value: string) => void
  driveTime: string
  setDriveTime: (value: string) => void
  
  isEditing: boolean
  isRecurringParent: boolean
  isRecurringInstance: boolean
  editMode: 'single' | 'all'
  setEditMode: (value: 'single' | 'all') => void
  
  assignableFamilyMembers: any[]
  driverHelperFamilyMembers: any[]
  
  getDisplayName: (member: any) => string
  getDayLetter: (day: string) => string
  getSelectedDaysSummary: () => string
}

export function EventModalUI({
  isOpen,
  onClose,
  onSave,
  onDelete,
  loading,
  error,
  
  title,
  setTitle,
  description,
  setDescription,
  
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
  
  allDay,
  setAllDay,
  
  location,
  setLocation,
  
  assignedMembers,
  setAssignedMembers,
  driverHelper,
  setDriverHelper,
  
  showRecurringOptions,
  toggleRecurringOptions,
  recurrenceType,
  setRecurrenceType,
  recurrenceInterval,
  setRecurrenceInterval,
  recurrenceEndDate,
  setRecurrenceEndDate,
  recurrenceEndCount,
  setRecurrenceEndCount,
  recurrenceEndType,
  setRecurrenceEndType,
  selectedDays,
  handleDayToggle,
  
  showAdditionalOptions,
  toggleAdditionalOptions,
  arrivalTime,
  setArrivalTime,
  driveTime,
  setDriveTime,
  
  isEditing,
  isRecurringParent,
  isRecurringInstance,
  editMode,
  setEditMode,
  
  assignableFamilyMembers,
  driverHelperFamilyMembers,
  
  getDisplayName,
  getDayLetter,
  getSelectedDaysSummary
}: EventModalUIProps) {
  if (!isOpen) return null

  console.log('🔧 EventModalUI render:', {
    title,
    startDate,
    startTime,
    endDate,
    endTime,
    isEditing
  })

  // Safely format dates to prevent "Invalid time value" errors
  const formatSafeDate = (dateStr: string, timeStr: string) => {
    try {
      if (!dateStr || !timeStr) {
        console.warn('Invalid date/time inputs:', { dateStr, timeStr })
        return 'Invalid date'
      }
      
      const dateTimeStr = `${dateStr}T${timeStr}`
      const date = new Date(dateTimeStr)
      
      if (!isValid(date)) {
        console.warn('Invalid date detected:', { dateStr, timeStr, dateTimeStr })
        return 'Invalid date'
      }
      
      return format(date, 'PPpp')
    } catch (error) {
      console.error('Error formatting date:', error, { dateStr, timeStr })
      return 'Invalid date'
    }
  }

  const startDateFormatted = formatSafeDate(startDate, startTime)
  const endDateFormatted = formatSafeDate(endDate, endTime)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Event' : 'Create Event'}
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Basic Event Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Enter event title"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  disabled={allDay}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  disabled={allDay}
                />
              </div>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">All day event</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Enter location (optional)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                rows={3}
                placeholder="Enter description (optional)"
              />
            </div>
          </div>
          
          {/* Assigned Family Members */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Assign Family Members
            </h3>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {assignableFamilyMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">No family members available</p>
                ) : (
                  assignableFamilyMembers.map((member) => (
                    <label key={member.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={assignedMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignedMembers([...assignedMembers, member.id])
                          } else {
                            setAssignedMembers(assignedMembers.filter(id => id !== member.id))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-2 flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: member.color }}
                        />
                        <span className="text-sm text-gray-700">
                          {getDisplayName(member)}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <div>
            {isEditing && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button
              onClick={onSave}
              disabled={loading || !title.trim()}
              loading={loading}
            >
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}