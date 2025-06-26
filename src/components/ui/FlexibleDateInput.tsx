import { useState, useRef, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'

interface FlexibleDateInputProps {
  label: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export const FlexibleDateInput = ({
  label,
  value = '',
  onChange,
  placeholder = 'MM/DD or MM/DD/YYYY',
  disabled = false,
  className = ''
}: FlexibleDateInputProps) => {
  const [inputValue, setInputValue] = useState(value)
  const [showCalendar, setShowCalendar] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  // SMART DATE PARSING - Accepts multiple common formats
  const parseAndValidateDate = (input: string): { isValid: boolean; formatted?: string; error?: string } => {
    if (!input.trim()) {
      return { isValid: true } // Empty is valid (optional field)
    }

    const cleaned = input.trim()
    
    // Define parsing patterns in order of preference
    const patterns = [
      // MMDD format (e.g., "0119" -> "01/19")
      {
        regex: /^(\d{2})(\d{2})$/,
        parse: (match: RegExpMatchArray) => {
          const month = match[1]
          const day = match[2]
          return `${month}/${day}`
        },
        description: 'MMDD'
      },
      
      // MMDDYYYY format (e.g., "01192025" -> "01/19/2025")
      {
        regex: /^(\d{2})(\d{2})(\d{4})$/,
        parse: (match: RegExpMatchArray) => {
          const month = match[1]
          const day = match[2]
          const year = match[3]
          return `${month}/${day}/${year}`
        },
        description: 'MMDDYYYY'
      },
      
      // MM/DD format (e.g., "01/19", "1/19")
      {
        regex: /^(\d{1,2})\/(\d{1,2})$/,
        parse: (match: RegExpMatchArray) => {
          const month = match[1].padStart(2, '0')
          const day = match[2].padStart(2, '0')
          return `${month}/${day}`
        },
        description: 'MM/DD'
      },
      
      // MM/DD/YYYY format (e.g., "01/19/2025", "1/19/2025")
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        parse: (match: RegExpMatchArray) => {
          const month = match[1].padStart(2, '0')
          const day = match[2].padStart(2, '0')
          const year = match[3]
          return `${month}/${day}/${year}`
        },
        description: 'MM/DD/YYYY'
      },
      
      // MM/DD/YY format (e.g., "1/19/25" -> "01/19/2025")
      {
        regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
        parse: (match: RegExpMatchArray) => {
          const month = match[1].padStart(2, '0')
          const day = match[2].padStart(2, '0')
          let year = parseInt(match[3])
          // Convert 2-digit year to 4-digit (00-49 = 2000-2049, 50-99 = 1950-1999)
          year = year < 50 ? 2000 + year : 1900 + year
          return `${month}/${day}/${year}`
        },
        description: 'MM/DD/YY'
      },
      
      // MM-DD format (e.g., "01-19", "1-19")
      {
        regex: /^(\d{1,2})-(\d{1,2})$/,
        parse: (match: RegExpMatchArray) => {
          const month = match[1].padStart(2, '0')
          const day = match[2].padStart(2, '0')
          return `${month}/${day}`
        },
        description: 'MM-DD'
      },
      
      // MM-DD-YYYY format (e.g., "01-19-2025")
      {
        regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
        parse: (match: RegExpMatchArray) => {
          const month = match[1].padStart(2, '0')
          const day = match[2].padStart(2, '0')
          const year = match[3]
          return `${month}/${day}/${year}`
        },
        description: 'MM-DD-YYYY'
      }
    ]

    // Try each pattern
    for (const pattern of patterns) {
      const match = cleaned.match(pattern.regex)
      if (match) {
        const formatted = pattern.parse(match)
        
        // Validate the parsed date
        const parts = formatted.split('/')
        const month = parseInt(parts[0])
        const day = parseInt(parts[1])
        
        // Basic range validation
        if (month < 1 || month > 12) {
          return { isValid: false, error: 'Month must be between 1 and 12' }
        }
        if (day < 1 || day > 31) {
          return { isValid: false, error: 'Day must be between 1 and 31' }
        }

        // Validate actual date exists (handles Feb 30, etc.)
        if (parts.length === 3) {
          // Full date with year
          const year = parseInt(parts[2])
          const testDate = new Date(year, month - 1, day)
          if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
            return { isValid: false, error: 'Invalid date (day does not exist in that month)' }
          }
        } else {
          // Month/day only - test with a non-leap year to catch Feb 29
          const testDate = new Date(2023, month - 1, day)
          if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
            return { isValid: false, error: 'Invalid date (day does not exist in that month)' }
          }
        }

        return { isValid: true, formatted }
      }
    }

    return { 
      isValid: false, 
      error: 'Please use a valid date format (e.g., 0119, 01/19, 1/19/25, 01/19/2025)' 
    }
  }

  // SIMPLE INPUT CHANGE - NO AUTO-FORMATTING
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setError('') // Clear any previous errors
  }

  // SMART VALIDATION AND FORMATTING ON BLUR
  const handleInputBlur = () => {
    const validation = parseAndValidateDate(inputValue)
    
    if (!validation.isValid && validation.error) {
      setError(validation.error)
    } else {
      setError('')
      
      // If we have a formatted version and it's different from input, update it
      if (validation.formatted && validation.formatted !== inputValue) {
        setInputValue(validation.formatted)
        onChange(validation.formatted)
      } else {
        onChange(inputValue)
      }
    }
  }

  const handleCalendarSelect = (selectedDate: Date) => {
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0')
    const day = selectedDate.getDate().toString().padStart(2, '0')
    const year = selectedDate.getFullYear()
    
    const formatted = `${month}/${day}/${year}`
    setInputValue(formatted)
    onChange(formatted)
    setShowCalendar(false)
    setError('')
  }

  const clearValue = () => {
    setInputValue('')
    onChange('')
    setError('')
  }

  const getCurrentDate = () => {
    if (!inputValue) return new Date()
    
    const validation = parseAndValidateDate(inputValue)
    if (validation.isValid && validation.formatted) {
      const parts = validation.formatted.split('/')
      
      if (parts.length === 3) {
        const year = parseInt(parts[2])
        return new Date(year, parseInt(parts[0]) - 1, parseInt(parts[1]))
      } else if (parts.length === 2) {
        const currentYear = new Date().getFullYear()
        return new Date(currentYear, parseInt(parts[0]) - 1, parseInt(parts[1]))
      }
    }
    
    return new Date()
  }

  return (
    <div className={`w-full ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 pr-20 ${
            error 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-gray-300 focus:border-blue-500'
          }`}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {inputValue && (
            <button
              type="button"
              onClick={clearValue}
              disabled={disabled}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear date"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Open calendar"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar Dropdown */}
        {showCalendar && (
          <div
            ref={calendarRef}
            className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4"
          >
            <MiniCalendar
              selectedDate={getCurrentDate()}
              onDateSelect={handleCalendarSelect}
              onClose={() => setShowCalendar(false)}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      <p className="mt-1 text-xs text-gray-500">
        Accepts: 0119, 01/19, 1/19, 01/19/2025, 1/19/25, etc.
      </p>
    </div>
  )
}

// Mini Calendar Component
interface MiniCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onClose: () => void
}

const MiniCalendar = ({ selectedDate, onDateSelect, onClose }: MiniCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  const today = new Date()
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Generate calendar days
  const days = []
  
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(year, month, day)
    onDateSelect(selectedDate)
  }

  const isSelectedDay = (day: number) => {
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === month && 
           selectedDate.getFullYear() === year
  }

  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year
  }

  return (
    <div className="w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        
        <button
          type="button"
          onClick={() => navigateMonth('next')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-xs text-gray-500 text-center py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="aspect-square">
            {day && (
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                className={`w-full h-full text-sm rounded hover:bg-blue-100 transition-colors ${
                  isSelectedDay(day)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : isToday(day)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between">
        <button
          type="button"
          onClick={() => onDateSelect(new Date())}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}