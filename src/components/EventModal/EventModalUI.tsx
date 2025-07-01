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

        <label className="block">
          Title
          <input
            className="mt-1 w-full border rounded p-2"
            value={title}
            onChange={e => onChangeField('title', e.target.value)}
          />
        </label>

        <label className="block">
          Description
          <textarea
            className="mt-1 w-full border rounded p-2"
            value={description}
            onChange={e => onChangeField('description', e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label>
            Start date
            <input
              type="date"
              className="mt-1 w-full border rounded p-2"
              value={startDate}
              onChange={e => onChangeField('startDate', e.target.value)}
            />
          </label>
          <label>
            Start time
            <input
              type="time"
              className="mt-1 w-full border rounded p-2"
              value={startTime}
              onChange={e => onChangeField('startTime', e.target.value)}
              disabled={allDay}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label>
            End date
            <input
              type="date"
              className="mt-1 w-full border rounded p-2"
              value={endDate}
              onChange={e => onChangeField('endDate', e.target.value)}
            />
          </label>
          <label>
            End time
            <input
              type="time"
              className="mt-1 w-full border rounded p-2"
              value={endTime}
              onChange={e => onChangeField('endTime', e.target.value)}
              disabled={allDay}
            />
          </label>
        </div>

        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={allDay}
            onChange={e => onChangeField('allDay', e.target.checked)}
          />
          <span className="ml-2">All day</span>
        </label>

        <label className="block">
          Location
          <input
            className="mt-1 w-full border rounded p-2"
            value={location}
            onChange={e => onChangeField('location', e.target.value)}
          />
        </label>

        <h3 className="font-medium">Assignments</h3>
        <div className="grid grid-cols-2 gap-2">
          {familyOptions.map(m => (
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
            {familyOptions.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>

        <h3 className="font-medium">Recurrence</h3>
        <label className="block">
          Repeats
          <select
            className="mt-1 w-full border rounded p-2"
            value={recurrenceType}
            onChange={e => onChangeField('recurrenceType', e.target.value)}
          >
            <option value="none">Never</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        {recurrenceType !== 'none' && (
          <div className="space-y-2">
            <label className="block">
              Every
              <input
                type="number"
                min={1}
                className="mt-1 w-full border rounded p-2"
                value={recurrenceInterval}
                onChange={e => onChangeField('recurrenceInterval', parseInt(e.target.value) || 1)}
              />
            </label>

            {recurrenceType === 'weekly' && (
              <div className="flex space-x-1">
                {weekdays.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`px-2 py-1 rounded ${
                      selectedDays.includes(d) ? 'bg-blue-500 text-white' : 'bg-gray-200'
                    }`}
                    onClick={() => onToggleDay(d)}
                  >
                    {d[0].toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <label>Ends</label>
              <select
                className="border rounded p-2"
                value={recurrenceEndType}
                onChange={e => onChangeField('recurrenceEndType', e.target.value)}
              >
                <option value="count">After</option>
                <option value="date">On date</option>
              </select>
              {recurrenceEndType === 'count' ? (
                <input
                  type="number"
                  min={1}
                  className="border rounded p-2 w-24"
                  value={recurrenceEndCount}
                  onChange={e =>
                    onChangeField('recurrenceEndCount', parseInt(e.target.value) || 1)
                  }
                />
              ) : (
                <input
                  type="date"
                  className="border rounded p-2"
                  value={recurrenceEndDate}
                  onChange={e => onChangeField('recurrenceEndDate', e.target.value)}
                />
              )}
            </div>
          </div>
        )}

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