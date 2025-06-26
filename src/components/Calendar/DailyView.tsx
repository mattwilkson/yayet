import { format, isSameDay } from 'date-fns'
import { CalendarEvent } from './types'
import { CalendarGrid } from './CalendarGrid'

interface DailyViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent?: (startTime: Date, endTime: Date) => void
  isSimplified?: boolean
}

export const DailyView = ({ currentDate, events, onEventClick, onCreateEvent, isSimplified = false }: DailyViewProps) => {
  return (
    <div className="h-full flex flex-col">
      {/* Daily header with date on top */}
      <div className="border-b border-gray-200 bg-white p-4 text-center">
        <div className={`text-2xl font-bold ${
          isSameDay(currentDate, new Date()) 
            ? 'text-blue-600' 
            : 'text-gray-900'
        }`}>
          {format(currentDate, 'd')}
        </div>
        <div className="text-lg font-medium text-gray-900">
          {format(currentDate, 'EEEE')}
        </div>
        <div className="text-sm text-gray-600">
          {format(currentDate, 'MMMM yyyy')}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1">
        <CalendarGrid
          date={currentDate}
          events={events}
          onEventClick={onEventClick}
          onCreateEvent={onCreateEvent}
          viewType="daily"
          isSimplified={isSimplified}
        />
      </div>
    </div>
  )
}