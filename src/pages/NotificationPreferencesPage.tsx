import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  getNotificationPreferences, 
  updateNotificationPreferences, 
  getUserNotifications,
  sendTestEmail,
  formatNotificationType,
  type NotificationPreferences,
  type EmailNotification
} from '../lib/emailNotifications'
import { Button } from '../components/ui/Button'
import { Calendar, Mail, CheckCircle, X, ArrowLeft, Shield, Bell, Clock, Send, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

export const NotificationPreferencesPage = () => {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [notifications, setNotifications] = useState<EmailNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testEmailSending, setTestEmailSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Get user's notification preferences
      const prefs = await getNotificationPreferences(user!.id)
      setPreferences(prefs)
      
      // Get recent notifications
      const notifs = await getUserNotifications(user!.id, 10)
      setNotifications(notifs)
    } catch (error: any) {
      console.error('Error fetching notification data:', error)
      setError('Failed to load your notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!preferences) return
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const updated = await updateNotificationPreferences(preferences)
      
      if (updated) {
        setSuccess('Notification preferences saved successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to save notification preferences')
      }
    } catch (error: any) {
      console.error('Error saving notification preferences:', error)
      setError('Failed to save your preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestEmail = async () => {
    try {
      setTestEmailSending(true)
      setTestEmailResult(null)
      
      const result = await sendTestEmail(user!.email!)
      setTestEmailResult(result)
      
      // Refresh notifications list after sending test email
      const notifs = await getUserNotifications(user!.id, 10)
      setNotifications(notifs)
    } catch (error: any) {
      console.error('Error sending test email:', error)
      setTestEmailResult({
        success: false,
        message: error.message || 'Failed to send test email'
      })
    } finally {
      setTestEmailSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a')
    } catch (error) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading your preferences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Family Scheduler</span>
            </div>
            
            <a 
              href="/dashboard"
              className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Page Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Notification Preferences</h1>
                <p className="text-sm text-gray-600">
                  Manage how and when you receive notifications
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          {preferences && (
            <div className="p-6 space-y-8">
              {/* Event Reminders Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Event Reminders</h2>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.eventReminders}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          eventReminders: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-900 font-medium">
                        Send me event reminders
                      </span>
                    </label>
                  </div>
                  
                  {preferences.eventReminders && (
                    <div className="ml-6 space-y-3">
                      <p className="text-sm text-gray-600">
                        How far in advance would you like to be reminded?
                      </p>
                      
                      <div className="flex items-center space-x-4">
                        <select
                          value={preferences.reminderTimeHours}
                          onChange={(e) => setPreferences({
                            ...preferences,
                            reminderTimeHours: parseInt(e.target.value)
                          })}
                          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="1">1 hour before</option>
                          <option value="2">2 hours before</option>
                          <option value="4">4 hours before</option>
                          <option value="12">12 hours before</option>
                          <option value="24">24 hours before</option>
                          <option value="48">2 days before</option>
                        </select>
                      </div>
                      
                      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center mb-1">
                          <Clock className="h-3 w-3 text-blue-600 mr-1" />
                          <span className="font-medium text-blue-800">How reminders work:</span>
                        </div>
                        <p>
                          You'll receive an email reminder before each event you're assigned to.
                          The reminder will include all event details and a link to view it in your calendar.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Assignments Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Event Assignments</h2>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.eventAssignments}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          eventAssignments: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-900 font-medium">
                        Notify me when I'm assigned to an event
                      </span>
                    </label>
                  </div>
                  
                  {preferences.eventAssignments && (
                    <div className="ml-6 mt-3 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                      <p>
                        You'll receive an email notification whenever someone assigns you to an event
                        or when you're designated as a driver/helper.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Family Invitations Section */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Family Invitations</h2>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.familyInvitations}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          familyInvitations: e.target.checked
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-900 font-medium">
                        Notify me about family invitations
                      </span>
                    </label>
                  </div>
                  
                  {preferences.familyInvitations && (
                    <div className="ml-6 mt-3 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                      <p>
                        You'll receive an email notification when someone invites you to join their family
                        or when someone accepts your invitation.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Email Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Test Notifications</h2>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Send a test email to verify your notification settings
                    </p>
                    <p className="text-xs text-gray-500">
                      The test will be sent to: {user?.email}
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleSendTestEmail}
                    loading={testEmailSending}
                    disabled={testEmailSending}
                    variant="outline"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Email
                  </Button>
                </div>
                
                {testEmailResult && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    testEmailResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    {testEmailResult.success ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        {testEmailResult.message}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <X className="h-4 w-4 mr-2 text-red-600" />
                        {testEmailResult.message}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Notifications */}
              {notifications.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Recent Notifications</h2>
                    
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {showHistory ? 'Hide history' : 'Show history'}
                      <span className="ml-1">{showHistory ? '▲' : '▼'}</span>
                    </button>
                  </div>
                  
                  {showHistory && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Subject</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {notifications.map((notification) => (
                              <tr key={notification.id}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {formatNotificationType(notification.notificationType)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {notification.emailSubject}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    notification.status === 'sent' 
                                      ? 'bg-green-100 text-green-800' 
                                      : notification.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {notification.status === 'sent' 
                                    ? formatDate(notification.sentAt || notification.createdAt)
                                    : formatDate(notification.scheduledFor)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                {error && (
                  <div className="text-sm text-red-600">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {success}
                  </div>
                )}
                
                <div className="ml-auto flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={fetchData}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  
                  <Button
                    onClick={handleSavePreferences}
                    loading={saving}
                    disabled={saving}
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}