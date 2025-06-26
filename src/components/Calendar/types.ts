export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  all_day: boolean
  location?: string
  recurrence_rule?: string
  family_id: string
  created_by_user_id: string
  created_at: string
  updated_at: string
  parent_event_id?: string // ADDED: For recurring event instances
  is_recurring_parent?: boolean // ADDED: To identify parent recurring events
  recurrence_instance_date?: string // ADDED: For recurring instances
  is_recurring_instance?: boolean // ADDED: To identify virtual instances
  isHoliday?: boolean // Flag to identify holiday events
  isSpecialEvent?: boolean // Flag to identify birthday/anniversary events
  specialEventType?: 'birthday' | 'anniversary' // Type of special event
  familyMemberId?: string // ID of family member for special events
  familyMemberName?: string // Name of family member for special events
  event_assignments?: Array<{
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