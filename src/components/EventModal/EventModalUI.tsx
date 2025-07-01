// File: src/components/EventModal/EventModalUI.tsx
import React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Button } from '../ui/Button'
import { 
  Checkbox, 
  Input, 
  Select, 
  Textarea 
} from '../ui/Forms'

interface Assignment {
  family_member_id: string
  is_driver_helper: boolean
}

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
  onChangeField: (field: string, value: any) => void
  onToggleDay: (day: string) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  familyOptions: { id: string; name: string }[]
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
  onChangeField,
  onToggleDay,
  onSave,
  onDelete,
  onClose,
  familyOptions,
}: EventModalUIProps) {
  // parse into Date objects
  const startISO = `${startDate}T${startTime}`
  const endISO   = `${endDate}T${endTime}`
  const startDt  = parseISO(startISO)
  const endDt    = parseISO(endISO)

  const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

  return (
    <div className="modal-backdrop">
      <div className="modal p-6 space-y-4">
        <h2 className="text-xl font-semibold">{title || 'New event'}</h2>

        <Input
          label="Title"
          value={title}
          onChange={e => onChangeField('title', e.target.value)}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={e => onChangeField('description', e.target.value)}
        />

        <div className="flex space-x-2">
          <Input
            type="date"
            label="Start date"
            value={startDate}
            onChange={e => onChangeField('startDate', e.target.value)}
          />
          <Input
            type="time"
            label="Start time"
            value={startTime}
            onChange={e => onChangeField('startTime', e.target.value)}
            disabled={allDay}
          />
        </div>

        <div className="flex space-x-2">
          <Input
            type="date"
            label="End date"
            value={endDate}
            onChange={e => onChangeField('endDate', e.target.value)}
          />
          <Input
            type="time"
            label="End time"
            value={endTime}
            onChange={e => onChangeField('endTime', e.target.value)}
            disabled={allDay}
          />
        </div>

        <Checkbox
          label="All day"
          checked={allDay}
          onChange={e => onChangeField('allDay', e.target.checked)}
        />

        <Input
          label="Location"
          value={location}
          onChange={e => onChangeField('location', e.target.value)}
        />

        <h3 className="font-medium">Assignments</h3>
        <div className="grid grid-cols-2 gap-2">
          {familyOptions.map(m => (
            <Checkbox
              key={m.id}
              label={m.name}
              checked={assignedMembers.includes(m.id)}
              onChange={e => {
                const next = e.target.checked
                  ? [...assignedMembers, m.id]
                  : assignedMembers.filter(x => x !== m.id)
                onChangeField('assignedMembers', next)
              }}
            />
          ))}
        </div>

        <h3 className="font-medium mt-4">Driver/Helper</h3>
        <Select
          label="Driver/Helper"
          value={driverHelper}
          onChange={e => onChangeField('driverHelper', e.target.value)}
        >
          <option value="">(none)</option>
          {familyOptions.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>

        <h3 className="font-medium mt-4">Recurrence</h3>
        <div className="space-y-2">
          <Select
            label="Repeats"
            value={recurrenceType}
            onChange={e => onChangeField('recurrenceType', e.target.value)}
          >
            <option value="none">Never</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>

          {recurrenceType !== 'none' && (
            <>
              <Input
                type="number"
                label="Every"
                value={recurrenceInterval.toString()}
                onChange={e =>
                  onChangeField('recurrenceInterval', parseInt(e.target.value) || 1)
                }
                min={1}
              />
              {recurrenceType === 'weekly' && (
                <div className="flex space-x-1">
                  {weekdays.map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`px-2 py-1 rounded ${
                        selectedDays.includes(day)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200'
                      }`}
                      onClick={() => onToggleDay(day)}
                    >
                      {day.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex space-x-2 items-center">
                <label>Ends</label>
                <select
                  value={recurrenceEndType}
                  onChange={e => onChangeField('recurrenceEndType', e.target.value)}
                >
                  <option value="count">After</option>
                  <option value="date">On date</option>
                </select>
                {recurrenceEndType === 'count' ? (
                  <Input
                    type="number"
                    value={recurrenceEndCount.toString()}
                    onChange={e =>
                      onChangeField('recurrenceEndCount', parseInt(e.target.value) || 1)
                    }
                    min={1}
                  />
                ) : (
                  <Input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={e => onChangeField('recurrenceEndDate', e.target.value)}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <h3 className="font-medium mt-4">Preview</h3>
        <p>
          {isValid(startDt) ? format(startDt, 'PPpp') : '--'}
          {' – '}
          {isValid(endDt) ? format(endDt, 'PPpp') : '--'}
        </p>

        <div className="flex justify-end space-x-2 mt-6">
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