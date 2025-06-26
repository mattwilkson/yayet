import { supabase } from './supabase'

interface Holiday {
  id: string
  name: string
  date: string
  created_at: string
}

// Fetch holidays for a given date range
export const fetchHolidays = async (startDate: Date, endDate: Date): Promise<Holiday[]> => {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return []
  }
}

// Convert holidays to calendar events format
export const convertHolidaysToEvents = (holidays: Holiday[]): any[] => {
  return holidays.map(holiday => ({
    id: `holiday-${holiday.id}`,
    title: holiday.name,
    description: `🎉 ${holiday.name}`,
    start_time: `${holiday.date}T00:00:00`,
    end_time: `${holiday.date}T23:59:59`,
    all_day: true,
    location: null,
    recurrence_rule: null,
    family_id: 'holidays',
    created_by_user_id: 'system',
    created_at: holiday.created_at,
    updated_at: holiday.created_at,
    event_assignments: [],
    isHoliday: true
  }))
}

// Get holidays for a specific month/year
const getHolidaysForMonth = async (year: number, month: number): Promise<Holiday[]> => {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  return fetchHolidays(startDate, endDate)
}

// Get holidays for a specific week
const getHolidaysForWeek = async (startOfWeek: Date): Promise<Holiday[]> => {
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  return fetchHolidays(startOfWeek, endOfWeek)
}

// Get holidays for a specific day
const getHolidaysForDay = async (date: Date): Promise<Holiday[]> => {
  const startDate = new Date(date)
  const endDate = new Date(date)
  return fetchHolidays(startDate, endDate)
}

// Check if a date is a holiday
const isHoliday = async (date: Date): Promise<boolean> => {
  const holidays = await getHolidaysForDay(date)
  return holidays.length > 0
}

// Get the name of holiday(s) for a specific date
const getHolidayNames = async (date: Date): Promise<string[]> => {
  const holidays = await getHolidaysForDay(date)
  return holidays.map(h => h.name)
}

// Federal holidays that typically result in government/business closures
const FEDERAL_HOLIDAYS = [
  'New Year\'s Day',
  'Martin Luther King Jr. Day',
  'Presidents Day',
  'Memorial Day',
  'Independence Day',
  'Labor Day',
  'Columbus Day',
  'Veterans Day',
  'Thanksgiving',
  'Christmas Day'
]

// Check if a holiday is a federal holiday
const isFederalHoliday = (holidayName: string): boolean => {
  return FEDERAL_HOLIDAYS.includes(holidayName)
}