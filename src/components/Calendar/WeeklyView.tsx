import { useState, useEffect, useRef } from 'react'
import { format, startOfWeek, addDays, isSameDay, addMinutes, startOfDay, isToday } from 'date-fns'
import { CalendarEvent } from './types'
import { EventBlock } from './EventBlock'

interface WeeklyViewProps {
  currentWeek: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent?: (startTime: Date, endTime: Date) => void
  isSimplified?: boolean
}

export const WeeklyView = ({ 
  currentWeek, 
  events, 
  onEventClick, 
  onCreateEvent,
  isSimplified = false 
}: WeeklyViewProps) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ time: Date; y: number; dayIndex: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ time: Date; y: number; dayIndex: number } | null>(null)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const weekStart  = startOfWeek(currentWeek)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  console.log('🔧 WeeklyView render:', {
    hasOnCreateEvent: !!onCreateEvent,
    eventsCount: events.length,
    currentWeek: currentWeek.toISOString(),
    isSimplified,
    weekDays: weekDays.map(d => d.toDateString())
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
  }, [currentWeek])

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time)
      const eventEnd = new Date(event.end_time)
      
      // For multi-day events, check if this day falls within the event range
      if (event.all_day && eventStart.toDateString() !== eventEnd.toDateString()) {
        return day >= eventStart && day <= eventEnd
      }
      
      // For single-day events, check if it's on this specific day
      return isSameDay(eventStart, day)
    }).sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  }

  // Generate time slots (24 hours, 30-minute increments)
  const timeSlots = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = addMinutes(startOfDay(new Date()), hour * 60 + minute)
      timeSlots.push(time)
    }
  }

  // Get all events for the week
  const weekEvents = weekDays.flatMap(day => getEventsForDay(day))
  
  // Separate all-day and timed events
  const allDayEvents = weekEvents.filter(event => event.all_day)
  const timedEvents = weekEvents.filter(event => !event.all_day)

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

  // Calculate current time position
  const getCurrentTimePosition = () => {
    const now = new Date()
    const today = weekDays.find(day => isToday(day))
    if (!today) return null
    
    const startOfToday = startOfDay(now)
    const minutesFromMidnight = (now.getTime() - startOfToday.getTime()) / (1000 * 60)
    const position = (minutesFromMidnight / 30) * 32 // 32px per 30-minute slot
    return position
  }

  const currentTimePosition = getCurrentTimePosition()

  // Convert Y position and day index to time - FIXED: Use the correct day
  const getTimeFromPosition = (y: number, dayIndex: number): Date => {
    const slotIndex = Math.floor(y / 32) // 32px per slot
    const clampedIndex = Math.max(0, Math.min(slotIndex, timeSlots.length - 1))
    const baseTime = timeSlots[clampedIndex]
    const targetDay = weekDays[dayIndex] // Use the actual day from weekDays array
    
    console.log('🕐 getTimeFromPosition:', {
      y,
      dayIndex,
      slotIndex,
      clampedIndex,
      baseTimeHours: baseTime.getHours(),
      baseTimeMinutes: baseTime.getMinutes(),
      targetDay: targetDay.toDateString(),
      weekDay: weekDays[dayIndex].toDateString()
    })
    
    // Create a new date with the target day and the time from the slot
    const result = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      baseTime.getHours(),
      baseTime.getMinutes(),
      0,
      0
    )
    
    console.log('🕐 Calculated time:', result.toISOString())
    return result
  }

  // Reset all drag state
  const resetDragState = () => {
    console.log('🔧 WeeklyView: Resetting drag state')
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    setDragStartPos(null)
  }

  // Handle mouse events for creating new events
  const handleMouseDown = (e: React.MouseEvent, dayIndex: number) => {
    console.log('🖱️ WeeklyView mouse down:', { 
      dayIndex, 
      button: e.button, 
      hasOnCreateEvent: !!onCreateEvent,
      target: (e.target as HTMLElement).tagName,
      targetClass: (e.target as HTMLElement).className,
      currentTarget: (e.currentTarget as HTMLElement).tagName,
      weekDay: weekDays[dayIndex].toDateString()
    })
    
    // Only handle left mouse button and if onCreateEvent is provided
    if (e.button !== 0 || !onCreateEvent) {
      console.log('🖱️ Ignoring mouse down - wrong button or no onCreateEvent')
      return
    }
    
    // Don't start drag if clicking on an existing event
    const eventElement = (e.target as HTMLElement).closest('[data-event-id]')
    if (eventElement) {
      console.log('🖱️ Ignoring mouse down - clicked on existing event:', eventElement.getAttribute('data-event-id'))
      return
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const time = getTimeFromPosition(y, dayIndex)
    
    console.log('🖱️ WeeklyView click details:', {
      dayIndex,
      date: weekDays[dayIndex].toDateString(),
      time: time.toTimeString(),
      clickedTime: time.toISOString(),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      clientY: e.clientY,
      relativeY: y
    })
    
    // Store initial positions for drag detection
    setDragStartPos({ x: e.clientX, y: e.clientY })
    setDragStart({ time, y, dayIndex })
    setDragEnd({ time, y, dayIndex })
    
    e.preventDefault()
    e.stopPropagation()
  }

  const handleMouseMove = (e: React.MouseEvent, dayIndex: number) => {
    if (!dragStart || !dragStartPos) return
    
    // Calculate distance moved from initial click
    const deltaX = Math.abs(e.clientX - dragStartPos.x)
    const deltaY = Math.abs(e.clientY - dragStartPos.y)
    const dragThreshold = 5 // pixels
    
    // Start dragging if moved enough distance
    if (!isDragging && (deltaX > dragThreshold || deltaY > dragThreshold)) {
      setIsDragging(true)
      console.log('🖱️ Starting drag in WeeklyView')
    }
    
    if (isDragging) {
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const time = getTimeFromPosition(y, dayIndex)
      
      // Only allow dragging within the same day
      if (dayIndex === dragStart.dayIndex) {
        setDragEnd({ time, y, dayIndex })
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent, dayIndex: number) => {
    console.log('🖱️ WeeklyView mouse up:', { 
      dayIndex, 
      isDragging,
      hasDragStart: !!dragStart,
      hasOnCreateEvent: !!onCreateEvent,
      sameDay: dragStart ? dayIndex === dragStart.dayIndex : false,
      weekDay: weekDays[dayIndex].toDateString()
    })
    
    if (!dragStart || !onCreateEvent) {
      console.log('🖱️ No drag start or onCreateEvent, resetting state')
      resetDragState()
      return
    }
    
    // Only create event if ending in the same day
    if (dayIndex === dragStart.dayIndex) {
      if (isDragging && dragEnd) {
        // This was a drag operation - use drag start and end times
        const startTime = dragStart.time < dragEnd.time ? dragStart.time : dragEnd.time
        const endTime = dragStart.time < dragEnd.time ? dragEnd.time : dragStart.time
        
        // Ensure minimum 30-minute duration
        const minEndTime = addMinutes(startTime, 30)
        const finalEndTime = endTime < minEndTime ? minEndTime : endTime
        
        console.log('📅 Creating event from drag in WeeklyView:', {
          startTime: startTime.toISOString(),
          endTime: finalEndTime.toISOString(),
          dayIndex,
          weekDay: weekDays[dayIndex].toDateString()
        })
        
        onCreateEvent(startTime, finalEndTime)
      } else {
        // This was a simple click - create 1-hour event
        const startTime = dragStart.time
        const endTime = addMinutes(startTime, 60) // Default 1-hour duration
        
        console.log('📅 Creating event from click in WeeklyView:', {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          dayIndex,
          weekDay: weekDays[dayIndex].toDateString()
        })
        
        onCreateEvent(startTime, endTime)
      }
    } else {
      console.log('🖱️ Different day, not creating event')
    }
    
    resetDragState()
  }

  // Handle mouse leave to cancel drag
  const handleMouseLeave = () => {
    if (isDragging || dragStart) {
      console.log('🖱️ Canceling drag due to mouse leave')
      resetDragState()
    }
  }

  // Position events in each day column
  const getPositionedEventsForDay = (day: Date) => {
    const dayEvents = displayedTimedEvents.filter(event => 
      isSameDay(new Date(event.start_time), day)
    )

    return dayEvents.map(event => {
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
  }

  // Handle overlapping events for each day
  const getEventColumnsForDay = (dayEvents: any[]) => {
    const columns: any[][] = []
    
    dayEvents.forEach(event => {
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

  // Get all-day events for each specific day
  const getAllDayEventsForDay = (day: Date) => {
    if (isSimplified) {
      // For simplified view, show all events that are either all-day or long duration
      const dayEvents = getEventsForDay(day)
      return dayEvents.filter(event => {
        if (event.all_day) return true
        
        const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
        const durationMinutes = duration / (1000 * 60)
        const isDriveTimeEvent = event.title?.startsWith('🚗 ') || event.title?.includes(' - Drive Time')
        
        // Long events that aren't drive time events go in all-day section
        return durationMinutes > 60 && !isDriveTimeEvent
      })
    } else {
      // Regular view - only actual all-day events
      return getEventsForDay(day).filter(event => event.all_day)
    }
  }

  // Check if any day has all-day events
  const hasAnyAllDayEvents = weekDays.some(day => getAllDayEventsForDay(day).length > 0)

  // Calculate drag preview for specific day
  const getDragPreviewForDay = (dayIndex: number) => {
    if (!isDragging || !dragStart || !dragEnd || dragStart.dayIndex !== dayIndex) return null
    
    const startY = Math.min(dragStart.y, dragEnd.y)
    const endY = Math.max(dragStart.y, dragEnd.y)
    const height = Math.max(endY - startY, 32) // Minimum one slot height
    
    return {
      top: startY,
      height
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Week header - FIXED: Dates on top, day names below */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-white">
        <div className="w-16 flex-shrink-0 p-2"></div>
        {weekDays.map((day, dayIndex) => (
          <div key={day.toISOString()} className="p-2 text-center border-r border-gray-200 last:border-r-0">
            {/* Date number on top */}
            <div className={`text-lg font-semibold ${
              isSameDay(day, new Date()) 
                ? 'text-blue-600' 
                : 'text-gray-900'
            }`}>
              {format(day, 'd')}
            </div>
            {/* Day name below */}
            <div className="text-sm font-medium text-gray-900">
              {format(day, 'EEE')}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events section - only show if there are any all-day events */}
      {hasAnyAllDayEvents && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {isSimplified ? 'All Events' : 'All Day'}
            </h3>
          </div>
          
          {/* All-day events grid */}
          <div className="grid grid-cols-8 gap-0 pb-3">
            <div className="w-16 flex-shrink-0"></div>
            {weekDays.map((day) => {
              const dayAllDayEvents = getAllDayEventsForDay(day)
              
              return (
                <div 
                  key={day.toISOString()}
                  className="border-r border-gray-200 last:border-r-0 px-2 min-h-[40px]"
                >
                  <div className="space-y-1">
                    {dayAllDayEvents.map(event => (
                      <EventBlock
                        key={`${event.id}-${day.toISOString()}`}
                        event={event}
                        onClick={onEventClick}
                        isAllDay={true}
                        showTime={!event.all_day}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Unified scrolling grid */}
      <div 
        ref={gridRef}
        className="flex-1 overflow-y-auto relative"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
        onMouseLeave={handleMouseLeave}
      >
        {/* SIMPLIFIED APPROACH: Single container with explicit click handlers */}
        <div className="relative">
          {timeSlots.map((time, index) => (
            <div
              key={time.toISOString()}
              className="grid grid-cols-8 border-b border-gray-100"
              style={{ height: '32px' }}
            >
              {/* Time label */}
              <div className="w-16 flex-shrink-0 text-xs text-gray-500 pr-2 text-right flex items-center justify-end">
                {index % 2 === 0 && format(time, 'h:mm a')}
              </div>
              
              {/* Day columns with direct click handlers */}
              {weekDays.map((day, dayIndex) => (
                <div 
                  key={`${day.toISOString()}-${time.toISOString()}`}
                  className="border-r border-gray-200 last:border-r-0 relative hover:bg-blue-50/30 transition-colors cursor-pointer bg-white"
                  onMouseDown={(e) => {
                    console.log('🖱️ DIRECT Grid cell mouse down:', { 
                      dayIndex, 
                      timeSlot: format(time, 'h:mm a'),
                      day: day.toDateString(),
                      target: e.target,
                      currentTarget: e.currentTarget
                    })
                    handleMouseDown(e, dayIndex)
                  }}
                  onMouseMove={(e) => handleMouseMove(e, dayIndex)}
                  onMouseUp={(e) => {
                    console.log('🖱️ DIRECT Grid cell mouse up:', { 
                      dayIndex, 
                      timeSlot: format(time, 'h:mm a'),
                      day: day.toDateString()
                    })
                    handleMouseUp(e, dayIndex)
                  }}
                  style={{ 
                    minHeight: '32px',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  {index % 2 === 0 && (
                    <div className="absolute inset-0 border-t border-gray-200 pointer-events-none" />
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="grid grid-cols-8 items-center">
                <div className="w-16 flex-shrink-0"></div>
                <div className="col-span-7 h-0.5 bg-red-500 relative">
                  <div className="absolute right-0 w-2 h-2 bg-red-500 rounded-full -mt-0.75" />
                </div>
              </div>
            </div>
          )}

          {/* Drag previews for each day */}
          {weekDays.map((day, dayIndex) => {
            const dragPreview = getDragPreviewForDay(dayIndex)
            if (!dragPreview) return null
            
            return (
              <div
                key={`drag-preview-${dayIndex}`}
                className="absolute bg-blue-200 border-2 border-blue-400 rounded opacity-60 pointer-events-none z-10"
                style={{
                  top: `${dragPreview.top}px`,
                  height: `${dragPreview.height}px`,
                  left: `${((1 + dayIndex) / 8) * 100}%`,
                  width: `${(1 / 8) * 100}%`,
                  marginLeft: '2px',
                  marginRight: '2px'
                }}
              >
                <div className="p-1 text-xs text-blue-800 font-medium">
                  New Event
                </div>
              </div>
            )
          })}

          {/* Events overlay - positioned absolutely */}
          <div className="absolute inset-0 pointer-events-none z-30">
            <div className="grid grid-cols-8 h-full">
              <div className="w-16 flex-shrink-0"></div>
              {weekDays.map((day, dayIndex) => {
                const dayEvents = getPositionedEventsForDay(day)
                const eventColumns = getEventColumnsForDay(dayEvents)
                
                return (
                  <div 
                    key={day.toISOString()}
                    className="border-r border-gray-200 last:border-r-0 relative"
                  >
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
                            className="absolute inset-x-0 pointer-events-auto"
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
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}