import { useState } from 'react'
import { format, isSameDay, startOfWeek, addDays } from 'date-fns'
import { CalendarEvent } from './types'
import { formatTime } from '../../lib/utils'
import { Clock, MapPin, Users as UsersIcon, Car } from 'lucide-react'

interface ListViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

export const ListView = ({ currentDate, events, onEventClick }: ListViewProps) => {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

  const getDisplayName = (member: any) => {
    return member.nickname && member.nickname.trim() ? member.nickname : member.name
  }

  const getEventsToShow = () => {
    if (viewMode === 'day') {
      return events.filter(event => isSameDay(new Date(event.start_time), currentDate))
    } else {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = addDays(weekStart, 6)
      return events.filter(event => {
        const eventDate = new Date(event.start_time)
        return eventDate >= weekStart && eventDate <= addDays(weekEnd, 1)
      })
    }
  }

  const eventsToShow = getEventsToShow().sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  // Group events by date for week view
  const groupedEvents = viewMode === 'week' 
    ? eventsToShow.reduce((groups, event) => {
        const dateKey = format(new Date(event.start_time), 'yyyy-MM-dd')
        if (!groups[dateKey]) {
          groups[dateKey] = []
        }
        groups[dateKey].push(event)
        return groups
      }, {} as Record<string, CalendarEvent[]>)
    : {}

  const getEventColor = (event: CalendarEvent) => {
    if (!event.event_assignments || event.event_assignments.length === 0) {
      return '#9CA3AF'
    }

    const memberColors = event.event_assignments
      .filter((assignment: any) => !assignment.is_driver_helper)
      .map((assignment: any) => assignment.family_members?.color || '#3B82F6')
      .filter((color: string, index: number, arr: string[]) => arr.indexOf(color) === index)

    return memberColors[0] || '#9CA3AF'
  }

  const EventItem = ({ event }: { event: CalendarEvent }) => (
    <div
      onClick={() => onEventClick(event)}
      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-start space-x-3">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: getEventColor(event) }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {event.title}
            </h3>
            {event.all_day ? (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                All Day
              </span>
            ) : (
              <span className="text-sm text-gray-500">
                {formatTime(new Date(event.start_time))} - {formatTime(new Date(event.end_time))}
              </span>
            )}
          </div>

          {event.description && (
            <p className="text-gray-600 mt-1">{event.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
            {!event.all_day && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(new Date(event.start_time))} - {formatTime(new Date(event.end_time))}
              </div>
            )}

            {event.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {event.location}
              </div>
            )}

            {event.event_assignments?.length > 0 && (
              <div className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-1" />
                {event.event_assignments
                  .filter((assignment: any) => !assignment.is_driver_helper)
                  .map((assignment: any) => getDisplayName(assignment.family_members))
                  .join(', ')}
              </div>
            )}

            {event.event_assignments?.some((a: any) => a.is_driver_helper) && (
              <div className="flex items-center">
                <Car className="h-4 w-4 mr-1" />
                Driver: {event.event_assignments
                  .filter((a: any) => a.is_driver_helper)
                  .map((a: any) => getDisplayName(a.family_members))
                  .join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* View toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {viewMode === 'day' 
            ? format(currentDate, 'EEEE, MMMM d, yyyy')
            : `Week of ${format(startOfWeek(currentDate), 'MMMM d, yyyy')}`
          }
        </h2>
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'day'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'week'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'day' ? (
          <div className="space-y-3">
            {eventsToShow.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No events scheduled for this day
              </div>
            ) : (
              eventsToShow.map(event => (
                <EventItem key={event.id} event={event} />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedEvents).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No events scheduled for this week
              </div>
            ) : (
              Object.entries(groupedEvents).map(([dateKey, dayEvents]) => (
                <div key={dateKey}>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    {format(new Date(dateKey), 'EEEE, MMMM d')}
                  </h3>
                  <div className="space-y-3 ml-4">
                    {dayEvents.map(event => (
                      <EventItem key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}