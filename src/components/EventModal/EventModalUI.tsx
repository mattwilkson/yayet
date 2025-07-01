import React from 'react'
import { Button } from '../ui/Button'
import { format, isValid } from 'date-fns'

interface EventModalUIProps {
  isOpen: boolean
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  assignedMembers: { family_member_id: string; is_driver_helper: boolean }[]
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

export function EventModalUI({
  isOpen,
  title,
  description,
  startDate,
  startTime,
  endDate,
  endTime,
  assignedMembers,
  onClose,
  onSave,
  onDelete
}: EventModalUIProps) {
  if (!isOpen) return null

  const safeAssignments = assignedMembers ?? []
  
  // Safely format dates to prevent "Invalid time value" errors
  const formatSafeDate = (dateStr: string, timeStr: string) => {
    try {
      const dateTimeStr = `${dateStr}T${timeStr}`
      const date = new Date(dateTimeStr)
      return isValid(date) ? format(date, 'PPpp') : 'Invalid date'
    } catch (error) {
      console.error('Error formatting date:', error, { dateStr, timeStr })
      return 'Invalid date'
    }
  }

  const startDateFormatted = formatSafeDate(startDate, startTime)
  const endDateFormatted = formatSafeDate(endDate, endTime)

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{title || 'New event'}</h2>
        <p>{description}</p>
        <p>
          {startDateFormatted} – {endDateFormatted}
        </p>
        <h3>Assigned</h3>
        <ul>
          {safeAssignments.map(a => (
            <li key={`${a.family_member_id}-${a.is_driver_helper ? 'driver' : 'member'}`}>
              {a.family_member_id} {a.is_driver_helper ? '(driver/helper)' : ''}
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <Button onClick={onSave}>Save</Button>
          <Button variant="outline" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}