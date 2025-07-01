import { useState, useEffect, useRef } from 'react'
import { format, addMinutes, startOfDay, isSameDay, isToday } from 'date-fns'
import { CalendarEvent } from './types'
import { EventBlock } from './EventBlock'

interface CalendarGridProps {
  date: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent?: (startTime: Date, endTime: Date) => void
  viewType: 'daily' | 'weekly'
  isSimplified?: boolean
}

export const CalendarGrid = ({ 
  date, 
  events, 
  onEventClick, 
  onCreateEvent,
  viewType,
  isSimplified = false 
}: CalendarGridProps) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ time: Date; y: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ time: Date; y: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const currentTimeRef = useRef<HTMLDivElement>(null)

  console.log('🔧 CalendarGrid render:', {
    hasOnCreateEvent: !!onCreateEvent,
    viewType,
    eventsCount: events.length,
    date: date.toISOString(),
    isSimplified
  })

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to 7am on mount
  useEffect(() => {
    if (gridRef.current) {
      const sevenAM = 7 * 60 // 7am in minutes from midnight
      const scrollPosition = (sevenAM / 30) * 32 // 32px per 30-minute slot
      gridRef.current.scrollTop = scrollPosition
    }
  }, [date])

  // Generate time slots (24 hours, 30-minute increments)
  const timeSlots = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = addMinutes(startOfDay(date), hour * 60 + minute)
      timeSlots.push(time)
    }
  }

  // Filter events for this view
  const filteredEvents = events.filter(event => {
    if (viewType === 'daily') {
      return isSameDay(new Date(event.start_time), date)
    }
    // For weekly view, events are already filtered by the parent component
    return true
  })

  // Separate all-day and timed events
  const allDayEvents = filteredEvents.filter(event => event.all_day)
  const timedEvents = filteredEvents.filter(event => !event.all_day)

  // Filter timed events for simplified view
  const displayedTimedEvents = isSimplified 
    ? timedEvents.filter(event => {
        // Keep events that are short (≤ 60 min) OR are drive time/arrival time sub-events
        const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
        const durationMinutes = duration / (1000 * 60)
        const isDriveTimeEvent = event.title?.startsWith('🚗 ') || event.title?.includes(' - Drive Time')
        
        // Always show drive time events regardless of duration
        if (isDriveTimeEvent) return true
        
        // For regular events, only show short ones in the timed section
        return durationMinutes <= 60
      })
    : timedEvents

  // Get all events to show in all-day section for simplified view
  const allDayDisplayEvents = isSimplified 
    ? [...allDayEvents, ...timedEvents.filter(event => {
        // For simplified view, also show long events (> 60 min) in all-day section
        // UNLESS they are drive time/arrival time sub-events
        if (event.all_day) return false // Already included in allDayEvents
        
        const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
        const durationMinutes = duration / (1000 * 60)
        const isDriveTimeEvent = event.title?.startsWith('🚗 ') || event.title?.includes(' - Drive Time')
        
        // Long events that aren't drive time events go in all-day section
        return durationMinutes > 60 && !isDriveTimeEvent
      })]
    : allDayEvents

  // Calculate current time position
  const getCurrentTimePosition = () => {
    if (!isToday(date) && viewType === 'daily') return null
    
    const now = new Date()
    const startOfToday = startOfDay(now)
    const minutesFromMidnight = (now.getTime() - startOfToday.getTime()) / (1000 * 60)
    const position = (minutesFromMidnight / 30) * 32 // 32px per 30-minute slot
    return position
  }

  const currentTimePosition = getCurrentTimePosition()

  // Convert Y position to time
  const getTimeFromY = (y: number): Date => {
    const slotIndex = Math.floor(y / 32) // 32px per slot
    const clampedIndex = Math.max(0, Math.min(slotIndex, timeSlots.length - 1))
    const baseTime = timeSlots[clampedIndex]
    
    // Combine the time from the slot with the current date
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      baseTime.getHours(),
      baseTime.getMinutes()
    )
  }

  // Handle mouse events for creating new events
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('🖱️ CalendarGrid.handleMouseDown called:', {
      button: e.button,
      hasOnCreateEvent: !!onCreateEvent,
      target: (e.target as HTMLElement).tagName,
      targetClass: (e.target as HTMLElement).className
    })
    
    // Only handle left mouse button and if onCreateEvent is provided
    if (e.button !== 0 || !onCreateEvent) {
      console.log('🖱️ Ignoring mouse down - wrong button or no onCreateEvent')
      return
    }
    
    // Don't start drag if clicking on an existing event
    if ((e.target as HTMLElement).closest('[data-event-id]')) {
      console.log('🖱️ Ignoring mouse down - clicked on existing event')
      return
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const time = getTimeFromY(y)
    
    console.log('🖱️ CalendarGrid click details:', {
      time: time.toTimeString(),
      clickedTime: time.toISOString(),
      rect: { top: rect.top, left: rect.left },
      clientY: e.clientY,
      relativeY: y
    })
    
    setIsDragging(true)
    setDragStart({ time, y })
    setDragEnd({ time, y })
    
    e.preventDefault()
    e.stopPropagation()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const time = getTimeFromY(y)
    
    setDragEnd({ time, y })
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    console.log('🖱️ CalendarGrid.handleMouseUp called:', {
      isDragging,
      hasDragStart: !!dragStart,
      hasDragEnd: !!dragEnd,
      hasOnCreateEvent: !!onCreateEvent
    })
    
    if (!isDragging || !dragStart || !dragEnd || !onCreateEvent) {
      console.log('🖱️ No drag or missing data, resetting state')
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
      return
    }
    
    const startTime = dragStart.time < dragEnd.time ? dragStart.time : dragEnd.time
    const endTime = dragStart.time < dragEnd.time ? dragEnd.time : dragStart.time
    
    // Ensure minimum 30-minute duration
    const minEndTime = addMinutes(startTime, 30)
    const finalEndTime = endTime < minEndTime ? minEndTime : endTime
    
    console.log('📅 Creating event from CalendarGrid:', {
      startTime: startTime.toISOString(),
      endTime: finalEndTime.toISOString()
    })
    
    // Create the event
    onCreateEvent(startTime, finalEndTime)
    
    // Reset drag state
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  // Handle mouse leave to cancel drag
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
    }
  }

  // Calculate drag preview
  const getDragPreview = () => {
    if (!isDragging || !dragStart || !dragEnd) return null
    
    const startY = Math.min(dragStart.y, dragEnd.y)
    const endY = Math.max(dragStart.y, dragEnd.y)
    const height = Math.max(endY - startY, 32) // Minimum one slot height
    
    return {
      top: startY,
      height
    }
  }

  const dragPreview = getDragPreview()

  // Position events in the grid
  const positionedEvents = displayedTimedEvents.map(event => {
    const startTime = new Date(event.start_time)
    const endTime = new Date(event.end_time)
    const startOfEventDay = startOfDay(startTime)
    
    const startMinutes = (startTime.getTime() - startOfEventDay.getTime()) / (1000 * 60)
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    
    const top = (startMinutes / 30) * 32 // 32px per 30-minute slot
    const height = Math.max((duration / 30) * 32, 20) // Minimum 20px height
    
    return {
      ...event,
      top,
      height,
      startMinutes,
      endMinutes: startMinutes + duration
    }
  })

  // Handle overlapping events
  const getEventColumns = () => {
    const columns: any[][] = []
    
    positionedEvents.forEach(event => {
      let placed = false
      
      // Try to place in existing columns
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i]
        const hasOverlap = column.some(existingEvent => {
          return !(event.endMinutes <= existingEvent.startMinutes || 
                  event.startMinutes >= existingEvent.endMinutes)
        })
        
        if (!hasOverlap) {
          column.push(event)
          placed = true
          break
        }
      }
      
      // Create new column if needed
      if (!placed) {
        columns.push([event])
      }
    })
    
    return columns
  }

  const eventColumns = getEventColumns()

  return (
    <div className="flex flex-col h-full">
      {/* All-day events section */}
      {allDayDisplayEvents.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {isSimplified ? 'All Events' : 'All Day'}
          </h3>
          <div className="space-y-1">
            {allDayDisplayEvents
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map(event => (
                <EventBlock
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                  isAllDay={true}
                  showTime={!event.all_day}
                />
              ))}
          </div>
        </div>
      )}

      {/* Timed events grid */}
      <div 
        ref={gridRef}
        className="flex-1 overflow-y-auto relative"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Time labels and grid lines */}
          {timeSlots.map((time, index) => (
            <div
              key={time.toISOString()}
              className="flex border-b border-gray-100 hover:bg-blue-50/30 transition-colors cursor-crosshair"
              style={{ height: '32px' }}
            >
              <div className="w-16 flex-shrink-0 text-xs text-gray-500 pr-2 text-right">
                {index % 2 === 0 && format(time, 'h:mm a')}
              </div>
              <div className="flex-1 relative">
                {index % 2 === 0 && (
                  <div className="absolute inset-0 border-t border-gray-200" />
                )}
              </div>
            </div>
          ))}

          {/* Drag preview */}
          {dragPreview && (
            <div
              className="absolute left-16 right-0 bg-blue-200 border-2 border-blue-400 rounded opacity-60 pointer-events-none z-10"
              style={{
                top: `${dragPreview.top}px`,
                height: `${dragPreview.height}px`
              }}
            >
              <div className="p-1 text-xs text-blue-800 font-medium">
                New Event
              </div>
            </div>
          )}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              ref={currentTimeRef}
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="flex items-center">
                <div className="w-16 flex-shrink-0"></div>
                <div className="flex-1 h-0.5 bg-red-500" />
                <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
              </div>
            </div>
          )}

          {/* Events */}
          <div className="absolute inset-0 left-16">
            {eventColumns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className="absolute inset-0"
                style={{
                  left: `${(columnIndex / eventColumns.length) * 100}%`,
                  width: `${100 / eventColumns.length}%`,
                  paddingRight: '2px'
                }}
              >
                {column.map(event => (
                  <div
                    key={event.id}
                    className="absolute inset-x-0"
                    style={{
                      top: `${event.top}px`,
                      height: `${event.height}px`
                    }}
                    data-event-id={event.id}
                  >
                    <EventBlock
                      event={event}
                      onClick={onEventClick}
                      isOverlapping={eventColumns.length > 1}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}