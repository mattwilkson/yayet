import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { MarketingConsentCheckbox } from '../components/MarketingConsentCheckbox'
import { Calendar, Mail, CheckCircle, X, ArrowLeft, Shield, Bell } from 'lucide-react'

export const EmailPreferencesPage = () => {
  const { user, userProfile } = useAuth()
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [consentDate, setConsentDate] = useState<string | null>(null)
  const [consentSource, setConsentSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [consentHistory, setConsentHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (user) {
      fetchEmailPreferences()
    }
  }, [user])

  const fetchEmailPreferences = async () => {
    try {
      setLoading(true)
      
      // Get user's current marketing preferences
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('marketing_consent, consent_date, consent_source')
        .eq('id', user!.id)
        .single()

      if (userError) throw userError

      setMarketingConsent(userData.marketing_consent || false)
      setConsentDate(userData.consent_date)
      setConsentSource(userData.consent_source)
      
      // Get consent history
      const { data: historyData, error: historyError } = await supabase
        .from('marketing_consent_audit')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)
        
      if (historyError) throw historyError
      
      setConsentHistory(historyData || [])
    } catch (error: any) {
      console.error('Error fetching email preferences:', error)
      setError('Failed to load your email preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess(false)
      
      // Get client IP and user agent for audit trail
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()
      const ipAddress = ipData.ip
      const userAgent = navigator.userAgent
      
      // Call the RPC function to update consent with audit trail
      const { data, error } = await supabase.rpc('update_marketing_consent', {
        p_user_id: user!.id,
        p_consent: marketingConsent,
        p_source: 'preferences_page',
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      })
      
      if (error) throw error
      
      // Refresh data
      await fetchEmailPreferences()
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error: any) {
      console.error('Error saving email preferences:', error)
      setError('Failed to save your preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getConsentSourceDisplay = (source: string) => {
    switch (source) {
      case 'registration':
        return 'During registration'
      case 'onboarding':
        return 'During onboarding'
      case 'preferences_page':
        return 'Email preferences page'
      case 'unsubscribe_link':
        return 'Unsubscribe link'
      default:
        return source
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
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Email Preferences</h1>
                <p className="text-sm text-gray-600">
                  Manage your email notification and marketing preferences
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Account Emails Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Account Emails</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Bell className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">Essential Notifications</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  These emails are necessary for your account and cannot be disabled.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-800">Account Security</p>
                      <p className="text-sm text-gray-600">Password resets, security alerts</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Required
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-800">Family Invitations</p>
                      <p className="text-sm text-gray-600">Invites to join families</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Required
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Marketing Emails Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Marketing Emails</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <MarketingConsentCheckbox
                  checked={marketingConsent}
                  onChange={setMarketingConsent}
                  source="preferences"
                />
                
                {consentDate && (
                  <div className="mt-4 text-xs text-gray-500">
                    {marketingConsent ? (
                      <p>
                        You opted in to marketing emails {formatDate(consentDate)} 
                        {consentSource && ` (${getConsentSourceDisplay(consentSource)})`}.
                      </p>
                    ) : (
                      <p>
                        You are currently not subscribed to marketing emails.
                        {consentDate && ` Last updated ${formatDate(consentDate)}.`}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Consent History Toggle */}
                {consentHistory.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {showHistory ? 'Hide history' : 'Show consent history'}
                      <span className="ml-1">{showHistory ? '▲' : '▼'}</span>
                    </button>
                    
                    {/* Consent History */}
                    {showHistory && (
                      <div className="mt-2 text-xs border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Action</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Source</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {consentHistory.map((record, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                  {formatDate(record.created_at)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    record.consent_given 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {record.consent_given ? 'Opted in' : 'Opted out'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                  {getConsentSourceDisplay(record.source)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Your Privacy Matters</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                We're committed to protecting your privacy and handling your data ethically.
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• We never sell your personal information</li>
                <li>• You can opt out of marketing emails at any time</li>
                <li>• We only send emails you've explicitly consented to receive</li>
                <li>• All emails include an unsubscribe link</li>
              </ul>
              <div className="mt-3">
                <a 
                  href="/privacy-policy" 
                  target="_blank"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View our Privacy Policy
                </a>
              </div>
            </div>

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
                  Preferences saved successfully
                </div>
              )}
              
              <div className="ml-auto">
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
        </div>
      </div>
    </div>
  )
}