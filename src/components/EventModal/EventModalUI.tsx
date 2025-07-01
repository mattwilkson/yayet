import React from 'react'
import { Button } from '../ui/Button'
import { format } from 'date-fns'

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

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{title || 'New event'}</h2>
        <p>{description}</p>
        <p>
          {format(new Date(`${startDate}T${startTime}`), 'PPpp')} –{' '}
          {format(new Date(`${endDate}T${endTime}`), 'PPpp')}
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