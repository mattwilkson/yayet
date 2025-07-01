// File: src/components/EventModal/EventModalUI.tsx
import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Button } from '../ui/Button'

interface EventModalUIProps {
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
  recurrenceType: 'none'|'daily'|'weekly'|'monthly'|'yearly'
  recurrenceInterval: number
  selectedDays: string[]
  recurrenceEndType: 'count'|'date'
  recurrenceEndCount: number
  recurrenceEndDate: string
  familyOptions: { id: string; name: string }[]
  onChangeField: (field: string, value: any) => void
  onToggleDay: (day: string) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}

export function EventModalUI({
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
  recurrenceType,
  recurrenceInterval,
  selectedDays,
  recurrenceEndType,
  recurrenceEndCount,
  recurrenceEndDate,
  familyOptions,
  onChangeField,
  onToggleDay,
  onSave,
  onDelete,
  onClose,
}: EventModalUIProps) {
  const startDt = parseISO(`${startDate}T${startTime}`)
  const endDt   = parseISO(`${endDate}T${endTime}`)
  const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

  return (
    <div className="modal-backdrop">
      <div className="modal p-6 space-y-4 bg-white rounded shadow-lg">
        <h2 className="text-xl font-semibold">{title || 'New event'}</h2>

        {/* title, description, date/time inputs… */}

        <h3 className="font-medium">Assignments</h3>
        <div className="grid grid-cols-2 gap-2">
          {(familyOptions ?? []).map(m => (
            <label key={m.id} className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={assignedMembers.includes(m.id)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...assignedMembers, m.id]
                    : assignedMembers.filter(x => x !== m.id)
                  onChangeField('assignedMembers', next)
                }}
              />
              <span className="ml-2">{m.name}</span>
            </label>
          ))}
        </div>

        <label className="block">
          Driver/Helper
          <select
            className="mt-1 w-full border rounded p-2"
            value={driverHelper}
            onChange={e => onChangeField('driverHelper', e.target.value)}
          >
            <option value="">(none)</option>
            {(familyOptions ?? []).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>

        {/* recurrence controls… */}

        <h3 className="font-medium mt-4">Preview</h3>
        <p>
          {isValid(startDt) ? format(startDt, 'PPpp') : '--'}
          {' — '}
          {isValid(endDt)   ? format(endDt,   'PPpp') : '--'}
        </p>

        <div className="flex justify-end space-x-2 mt-6">
          <Button onClick={onSave}>Save</Button>
          <Button variant="outline" onClick={onDelete}>Delete</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}