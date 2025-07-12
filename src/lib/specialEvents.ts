import { supabase } from './supabase'

interface SpecialEvent {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  all_day: boolean
  location: null
  recurrence_rule: null
  family_id: string
  created_by_user_id: string
  created_at: string
  updated_at: string
  isSpecialEvent: boolean
  specialEventType: 'birthday' | 'anniversary'
  familyMemberId: string
  familyMemberName: string
  event_assignments: Array<{
    id: string
    family_member_id: string
    is_driver_helper: boolean
    family_members: {
      id: string
      name: string
      nickname?: string
      color: string
      relationship: string
    }
  }>
}

// Parse date string (MM/DD or MM/DD/YYYY) and return month/day
function parseDateString(dateStr: string): { month: number; day: number; year?: number } | null {
  if (!dateStr) return null
  
  try {
    // Handle MM/DD format
    if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const [month, day] = dateStr.split('/').map(Number)
      return { month, day }
    }
    
    // Handle MM/DD/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/').map(Number)
      return { month, day, year }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing date string:', dateStr, error)
    return null
  }
}

// Generate special events for a date range
export async function generateSpecialEvents(
  familyId: string,
  startDate: Date,
  endDate: Date
): Promise<SpecialEvent[]> {
  try {
    console.log('🎂 Generating special events for family:', familyId)
    
    // Get all family members with birthdays or anniversaries
    const { data: familyMembers, error } = await supabase
      .from('family_members')
      .select('id, name, nickname, relationship, birthday, anniversary, color')
      .eq('family_id', familyId)
      .or('birthday.not.is.null,anniversary.not.is.null')
    
    if (error) {
      console.error('Error fetching family members for special events:', error)
      return []
    }
    
    if (!familyMembers || familyMembers.length === 0) {
      console.log('🎂 No family members with birthdays/anniversaries found')
      return []
    }
    
    const specialEvents: SpecialEvent[] = []
    const startYear = startDate.getFullYear()
    const endYear = endDate.getFullYear()
    
    // Generate events for each year in the range
    for (let year = startYear; year <= endYear; year++) {
      for (const member of familyMembers) {
        const displayName = member.nickname && member.nickname.trim() ? member.nickname : member.name
        
        // Generate birthday events
        if (member.birthday) {
          const birthdayData = parseDateString(member.birthday)
          if (birthdayData) {
            const eventDate = new Date(year, birthdayData.month - 1, birthdayData.day)
            
            // Only include if the event date is within our range
            if (eventDate >= startDate && eventDate <= endDate) {
              // Calculate age if birth year is known
              let ageText = ''
              if (birthdayData.year) {
                const age = year - birthdayData.year
                ageText = ` (${age} years old)`
              }
              
              const birthdayEvent: SpecialEvent = {
                id: `birthday-${member.id}-${year}`,
                title: `🎂 ${displayName}'s Birthday${ageText}`,
                description: `${displayName}'s birthday${ageText}`,
                start_time: new Date(year, birthdayData.month - 1, birthdayData.day, 0, 0, 0).toISOString(),
                end_time: new Date(year, birthdayData.month - 1, birthdayData.day, 23, 59, 59).toISOString(),
                all_day: true,
                location: null,
                recurrence_rule: null,
                family_id: familyId,
                created_by_user_id: 'system',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                isSpecialEvent: true as true,
                specialEventType: 'birthday',
                familyMemberId: member.id,
                familyMemberName: displayName,
                event_assignments: [{
                  id: `birthday-assignment-${member.id}-${year}`,
                  family_member_id: member.id,
                  is_driver_helper: false,
                  family_members: {
                    id: member.id,
                    name: member.name,
                    nickname: member.nickname,
                    color: member.color || '#F59E0B',
                    relationship: member.relationship
                  }
                }]
              }
              
              specialEvents.push(birthdayEvent)
            }
          }
        }
        
        // Generate anniversary events
        if (member.anniversary) {
          const anniversaryData = parseDateString(member.anniversary)
          if (anniversaryData) {
            const eventDate = new Date(year, anniversaryData.month - 1, anniversaryData.day)
            
            // Only include if the event date is within our range
            if (eventDate >= startDate && eventDate <= endDate) {
              // Calculate years if anniversary year is known
              let yearsText = ''
              if (anniversaryData.year) {
                const years = year - anniversaryData.year
                yearsText = ` (${years} years)`
              }
              
              const anniversaryEvent: SpecialEvent = {
                id: `anniversary-${member.id}-${year}`,
                title: `💕 ${displayName}'s Anniversary${yearsText}`,
                description: `${displayName}'s anniversary${yearsText}`,
                start_time: new Date(year, anniversaryData.month - 1, anniversaryData.day, 0, 0, 0).toISOString(),
                end_time: new Date(year, anniversaryData.month - 1, anniversaryData.day, 23, 59, 59).toISOString(),
                all_day: true,
                location: null,
                recurrence_rule: null,
                family_id: familyId,
                created_by_user_id: 'system',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                isSpecialEvent: true as true,
                specialEventType: 'anniversary',
                familyMemberId: member.id,
                familyMemberName: displayName,
                event_assignments: [{
                  id: `anniversary-assignment-${member.id}-${year}`,
                  family_member_id: member.id,
                  is_driver_helper: false,
                  family_members: {
                    id: member.id,
                    name: member.name,
                    nickname: member.nickname,
                    color: member.color || '#EC4899',
                    relationship: member.relationship
                  }
                }]
              }
              
              specialEvents.push(anniversaryEvent)
            }
          }
        }
      }
    }
    
    console.log('🎂 Generated special events:', specialEvents.length)
    return specialEvents
  } catch (error) {
    console.error('Error generating special events:', error)
    return []
  }
}

// Get special events for a specific month
async function getSpecialEventsForMonth(familyId: string, year: number, month: number): Promise<SpecialEvent[]> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  return generateSpecialEvents(familyId, startDate, endDate)
}

// Get special events for a specific week
async function getSpecialEventsForWeek(familyId: string, startOfWeek: Date): Promise<SpecialEvent[]> {
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  return generateSpecialEvents(familyId, startOfWeek, endOfWeek)
}

// Get special events for a specific day
async function getSpecialEventsForDay(familyId: string, date: Date): Promise<SpecialEvent[]> {
  const startDate = new Date(date)
  const endDate = new Date(date)
  return generateSpecialEvents(familyId, startDate, endDate)
}

// Check if a date has any special events
async function hasSpecialEvents(familyId: string, date: Date): Promise<boolean> {
  const events = await getSpecialEventsForDay(familyId, date)
  return events.length > 0
}

// Get upcoming special events (next 30 days)
async function getUpcomingSpecialEvents(familyId: string): Promise<SpecialEvent[]> {
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(startDate.getDate() + 30)
  return generateSpecialEvents(familyId, startDate, endDate)
}