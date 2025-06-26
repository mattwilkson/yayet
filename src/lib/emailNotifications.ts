import { supabase } from './supabase'

// Interface for notification preferences
export interface NotificationPreferences {
  id?: string
  userId: string
  eventReminders: boolean
  eventAssignments: boolean
  familyInvitations: boolean
  reminderTimeHours: number
  createdAt?: string
  updatedAt?: string
}

// Interface for email notification
export interface EmailNotification {
  id: string
  userId: string
  eventId?: string
  notificationType: string
  emailTo: string
  emailSubject: string
  status: 'pending' | 'sent' | 'failed'
  scheduledFor: string
  sentAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
  event?: {
    id: string
    title: string
    description?: string
    startTime: string
    endTime: string
    location?: string
  }
}

// Get user's notification preferences
export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, create default preferences
        return createDefaultNotificationPreferences(userId)
      }
      throw error
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      eventReminders: data.event_reminders,
      eventAssignments: data.event_assignments,
      familyInvitations: data.family_invitations,
      reminderTimeHours: data.reminder_time_hours,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('Error getting notification preferences:', error)
    return null
  }
}

// Create default notification preferences
const createDefaultNotificationPreferences = async (userId: string): Promise<NotificationPreferences | null> => {
  try {
    const defaultPrefs: NotificationPreferences = {
      userId,
      eventReminders: true,
      eventAssignments: true,
      familyInvitations: true,
      reminderTimeHours: 24
    }
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: defaultPrefs.userId,
        event_reminders: defaultPrefs.eventReminders,
        event_assignments: defaultPrefs.eventAssignments,
        family_invitations: defaultPrefs.familyInvitations,
        reminder_time_hours: defaultPrefs.reminderTimeHours
      })
      .select()
      .single()
    
    if (error) throw error
    
    return {
      id: data.id,
      userId: data.user_id,
      eventReminders: data.event_reminders,
      eventAssignments: data.event_assignments,
      familyInvitations: data.family_invitations,
      reminderTimeHours: data.reminder_time_hours,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('Error creating default notification preferences:', error)
    return null
  }
}

// Update notification preferences
export const updateNotificationPreferences = async (preferences: NotificationPreferences): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        event_reminders: preferences.eventReminders,
        event_assignments: preferences.eventAssignments,
        family_invitations: preferences.familyInvitations,
        reminder_time_hours: preferences.reminderTimeHours
      })
      .eq('user_id', preferences.userId)
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return false
  }
}

// Get user's email notifications
export const getUserNotifications = async (
  userId: string, 
  limit: number = 10, 
  status?: 'pending' | 'sent' | 'failed'
): Promise<EmailNotification[]> => {
  try {
    let query = supabase
      .from('email_notifications')
      .select(`
        *,
        events (
          id,
          title,
          description,
          start_time,
          end_time,
          location
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return (data || []).map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      eventId: notification.event_id,
      notificationType: notification.notification_type,
      emailTo: notification.email_to,
      emailSubject: notification.email_subject,
      status: notification.status,
      scheduledFor: notification.scheduled_for,
      sentAt: notification.sent_at,
      errorMessage: notification.error_message,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at,
      event: notification.events ? {
        id: notification.events.id,
        title: notification.events.title,
        description: notification.events.description,
        startTime: notification.events.start_time,
        endTime: notification.events.end_time,
        location: notification.events.location
      } : undefined
    }))
  } catch (error) {
    console.error('Error getting user notifications:', error)
    return []
  }
}

// Send a test email
export const sendTestEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'send_test_email',
        data: { email }
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send test email')
    }
    
    const result = await response.json()
    return { 
      success: true, 
      message: 'Test email sent successfully! Please check your inbox.' 
    }
  } catch (error) {
    console.error('Error sending test email:', error)
    return { 
      success: false, 
      message: error.message || 'Failed to send test email' 
    }
  }
}

// Process pending notifications (for admin/cron use)
const processPendingNotifications = async (): Promise<{ 
  success: boolean; 
  processed: number;
  sent: number;
  failed: number;
  message: string 
}> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'process_pending'
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to process notifications')
    }
    
    const result = await response.json()
    return { 
      success: true,
      processed: result.processed || 0,
      sent: result.success || 0,
      failed: result.failed || 0,
      message: `Processed ${result.processed} notifications: ${result.success} sent, ${result.failed} failed`
    }
  } catch (error) {
    console.error('Error processing notifications:', error)
    return { 
      success: false,
      processed: 0,
      sent: 0,
      failed: 0,
      message: error.message || 'Failed to process notifications' 
    }
  }
}

// Format notification type for display
export const formatNotificationType = (type: string): string => {
  switch (type) {
    case 'event_reminder_24h':
      return '24-hour Event Reminder'
    case 'event_reminder_1h':
      return '1-hour Event Reminder'
    case 'event_assignment':
      return 'Event Assignment'
    case 'family_invitation':
      return 'Family Invitation'
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}