import { useState } from 'react'
import { format, addWeeks, subWeeks, addDays, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { CalendarViewSelector, CalendarViewType } from './CalendarViewSelector'
import { WeeklyView } from './WeeklyView'
import { DailyView } from './DailyView'
import { ListView } from './ListView'
import { CalendarEvent } from './types'

interface AdvancedCalendarProps {
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent?: (startTime: Date, endTime: Date) => void
  currentDate: Date
  onDateChange: (date: Date) => void
}

export const AdvancedCalendar = ({ 
  events, 
  onEventClick, 
  onCreateEvent,
  currentDate, 
  onDateChange 
}: AdvancedCalendarProps) => {
  const [viewType, setViewType] = useState<CalendarViewType>('weekly')

  console.log('🔧 AdvancedCalendar render:', {
    hasOnCreateEvent: !!onCreateEvent,
    viewType,
    eventsCount: events.length,
    currentDate: currentDate.toISOString()
  })

  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate: Date
    
    switch (viewType) {
      case 'weekly':
      case 'simplified-weekly':
        newDate = direction === 'prev' 
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1)
        break
      case 'daily':
      case 'simplified-daily':
      case 'list':
        newDate = direction === 'prev' 
          ? subDays(currentDate, 1)
          : addDays(currentDate, 1)
        break
      default:
        newDate = currentDate
    }
    
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const getDateRangeLabel = () => {
    switch (viewType) {
      case 'weekly':
      case 'simplified-weekly':
        return format(currentDate, 'MMMM yyyy')
      case 'daily':
      case 'simplified-daily':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'list':
        return format(currentDate, 'MMMM d, yyyy')
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  const handleCreateEvent = (startTime: Date, endTime: Date) => {
    console.log('🔧 AdvancedCalendar.handleCreateEvent called:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      hasOnCreateEvent: !!onCreateEvent
    })
    
    if (onCreateEvent) {
      onCreateEvent(startTime, endTime)
    } else {
      console.warn('⚠️ AdvancedCalendar: onCreateEvent prop is not provided')
    }
  }

  const renderCalendarView = () => {
    console.log('🔧 AdvancedCalendar.renderCalendarView:', {
      viewType,
      hasOnCreateEvent: !!onCreateEvent,
      hasHandleCreateEvent: !!handleCreateEvent
    })

    switch (viewType) {
      case 'weekly':
        return (
          <WeeklyView
            currentWeek={currentDate}
            events={events}
            onEventClick={onEventClick}
            onCreateEvent={handleCreateEvent}
            isSimplified={false}
          />
        )
      case 'simplified-weekly':
        return (
          <WeeklyView
            currentWeek={currentDate}
            events={events}
            onEventClick={onEventClick}
            onCreateEvent={handleCreateEvent}
            isSimplified={true}
          />
        )
      case 'daily':
        return (
          <DailyView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onCreateEvent={handleCreateEvent}
            isSimplified={false}
          />
        )
      case 'simplified-daily':
        return (
          <DailyView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
            onCreateEvent={handleCreateEvent}
            isSimplified={true}
          />
        )
      case 'list':
        return (
          <ListView
            currentDate={currentDate}
            events={events}
            onEventClick={onEventClick}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Calendar Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {getDateRangeLabel()}
            </h3>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <CalendarViewSelector
            currentView={viewType}
            onViewChange={setViewType}
          />
        </div>
      </div>

      {/* Calendar Content - Takes remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderCalendarView()}
      </div>
    </div>
  )
}