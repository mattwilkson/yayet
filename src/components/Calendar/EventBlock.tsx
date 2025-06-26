import { Clock, MapPin, Users as UsersIcon, Sparkles, Gift, Heart } from 'lucide-react'
import { CalendarEvent } from './types'
import { formatTime } from '../../lib/utils'

interface EventBlockProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
  isAllDay?: boolean
  isOverlapping?: boolean
  showTime?: boolean
}

export const EventBlock = ({ 
  event, 
  onClick, 
  isAllDay = false, 
  isOverlapping = false,
  showTime = false 
}: EventBlockProps) => {
  const getDisplayName = (member: any) => {
    return member.nickname && member.nickname.trim() ? member.nickname : member.name
  }

  const getEventColors = () => {
    // Special styling for holidays
    if (event.isHoliday) {
      return {
        backgroundColor: '#FEF3C7', // Light yellow background
        borderColor: '#F59E0B', // Amber border
        textColor: '#92400E' // Dark amber text
      }
    }

    // Special styling for birthday/anniversary events
    if (event.isSpecialEvent) {
      if (event.specialEventType === 'birthday') {
        return {
          backgroundColor: '#FEF3C7', // Light yellow background
          borderColor: '#F59E0B', // Amber border
          textColor: '#92400E' // Dark amber text
        }
      } else if (event.specialEventType === 'anniversary') {
        return {
          backgroundColor: '#FCE7F3', // Light pink background
          borderColor: '#EC4899', // Pink border
          textColor: '#BE185D' // Dark pink text
        }
      }
    }

    if (!event.event_assignments || event.event_assignments.length === 0) {
      return { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF', textColor: '#374151' }
    }

    // Get colors from assigned family members (excluding driver/helper)
    const memberColors = event.event_assignments
      .filter((assignment: any) => !assignment.is_driver_helper)
      .map((assignment: any) => assignment.family_members?.color || '#3B82F6')
      .filter((color: string, index: number, arr: string[]) => arr.indexOf(color) === index)

    if (memberColors.length === 0) {
      return { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF', textColor: '#374151' }
    }

    if (memberColors.length === 1) {
      const color = memberColors[0]
      return {
        backgroundColor: `${color}20`,
        borderColor: color,
        textColor: color
      }
    }

    // Multiple colors - create gradient
    const gradientColors = memberColors.join(', ')
    return {
      background: `linear-gradient(to right, ${gradientColors})`,
      borderColor: memberColors[0],
      textColor: '#FFFFFF'
    }
  }

  const eventColors = getEventColors()
  const opacity = isOverlapping ? 0.85 : 1

  // Determine if this event should be clickable
  const isClickable = !event.isHoliday && !event.isSpecialEvent

  // Calculate event height to determine text size
  const getEventHeight = (): 'small' | 'medium' | 'large' => {
    if (isAllDay) return 'medium'
    
    // For timed events, use the height property if available
    if ('height' in event) {
      const height = (event as any).height
      if (height < 40) return 'small'
      if (height < 80) return 'medium'
      return 'large'
    }
    
    return 'medium' // Default
  }
  
  const eventSize = getEventHeight()

  return (
    <div
      onClick={() => isClickable && onClick(event)}
      className={`
        group border rounded-lg transition-all duration-200 overflow-visible
        ${isAllDay ? 'min-h-[32px]' : 'h-full min-h-[20px]'}
        ${isClickable ? 'cursor-pointer hover:shadow-sm hover:scale-105' : 'cursor-default'}
        ${eventSize === 'small' ? 'px-2 py-0.5' : eventSize === 'medium' ? 'p-1.5' : 'p-2'}
      `}
      style={{
        background: eventColors.background || eventColors.backgroundColor,
        borderColor: eventColors.borderColor,
        color: eventColors.textColor,
        opacity
      }}
    >
      <div className="h-full flex flex-col justify-start">
        {/* Event Title - Always prioritized and shown first - NO TRUNCATION */}
        <div className={`
          font-semibold leading-tight
          ${eventSize === 'small' ? 'text-xs' : eventSize === 'medium' ? 'text-sm' : 'text-sm'}
        `}>
          <div className="flex items-start">
            {event.isHoliday && (
              <Sparkles className={`mr-1 flex-shrink-0 ${eventSize === 'small' ? 'h-2 w-2 mt-0.5' : 'h-3 w-3 mt-0.5'}`} />
            )}
            {event.isSpecialEvent && event.specialEventType === 'birthday' && (
              <Gift className={`mr-1 flex-shrink-0 ${eventSize === 'small' ? 'h-2 w-2 mt-0.5' : 'h-3 w-3 mt-0.5'}`} />
            )}
            {event.isSpecialEvent && event.specialEventType === 'anniversary' && (
              <Heart className={`mr-1 flex-shrink-0 ${eventSize === 'small' ? 'h-2 w-2 mt-0.5' : 'h-3 w-3 mt-0.5'}`} />
            )}
            <span className="break-words">
              {event.title}
            </span>
          </div>
          {showTime && !event.all_day && (
            <div className={`opacity-90 mt-0.5 ${eventSize === 'small' ? 'text-[10px]' : 'text-xs'}`}>
              {formatTime(new Date(event.start_time))} - {formatTime(new Date(event.end_time))}
            </div>
          )}
        </div>
        
        {/* Time - Only show if not all day and not already shown above */}
        {!isAllDay && !event.all_day && !showTime && !event.isHoliday && !event.isSpecialEvent && eventSize !== 'small' && (
          <div className="flex items-center text-xs mt-0.5 opacity-90">
            <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {formatTime(new Date(event.start_time))}
            </span>
          </div>
        )}
        
        {/* Location - Secondary priority */}
        {event.location && !isAllDay && !event.isHoliday && !event.isSpecialEvent && eventSize !== 'small' && (
          <div className="flex items-center text-xs mt-0.5 truncate opacity-90">
            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        {/* People assigned - Lowest priority */}
        {event.event_assignments?.length > 0 && !isAllDay && !event.isHoliday && !event.isSpecialEvent && eventSize !== 'small' && (
          <div className="flex items-center text-xs mt-0.5 opacity-90">
            <UsersIcon className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">
              {event.event_assignments
                .filter((assignment: any) => !assignment.is_driver_helper)
                .slice(0, 2)
                .map((assignment: any, index: number) => (
                  <span key={assignment.family_member_id}>
                    {index > 0 ? ', ' : ''}
                    {getDisplayName(assignment.family_members)}
                  </span>
                ))}
              {event.event_assignments.filter((a: any) => !a.is_driver_helper).length > 2 && (
                <span> +{event.event_assignments.filter((a: any) => !a.is_driver_helper).length - 2}</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}