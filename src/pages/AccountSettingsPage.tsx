import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { 
  getMarketingConsent, 
  updateMarketingConsent, 
  getConsentHistory,
  formatConsentSource,
  formatConsentDate
} from '../lib/emailMarketing'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { MarketingConsentCheckbox } from '../components/MarketingConsentCheckbox'
import { 
  Calendar, 
  ArrowLeft, 
  User, 
  Mail, 
  Shield, 
  Download, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  FileText,
  Clock,
  X
} from 'lucide-react'

export const AccountSettingsPage = () => {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [consentHistory, setConsentHistory] = useState<any[]>([])
  const [showConsentHistory, setShowConsentHistory] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isExportingData, setIsExportingData] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [userData, setUserData] = useState<any>(null)
  
  // For password change
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Get user's current marketing preferences
      const consentData = await getMarketingConsent(user!.id)
      if (consentData) {
        setMarketingConsent(consentData.hasConsent)
        
        // Get consent history
        const history = await getConsentHistory(user!.id)
        setConsentHistory(history)
      }
      
      // Get user profile data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single()
      
      if (userError) throw userError
      setUserData(userData)
      
    } catch (error: any) {
      console.error('Error fetching user data:', error)
      setError('Failed to load your account settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConsent = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const updated = await updateMarketingConsent(
        user!.id,
        marketingConsent,
        'preferences_page'
      )
      
      if (updated) {
        setSuccess('Marketing preferences updated successfully')
        
        // Refresh data
        await fetchUserData()
        
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to update marketing preferences')
      }
    } catch (error: any) {
      console.error('Error updating marketing consent:', error)
      setError('Failed to save your preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }
    
    try {
      setSaving(true)
      
      // First verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword
      })
      
      if (signInError) {
        setPasswordError('Current password is incorrect')
        setSaving(false)
        return
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) {
        setPasswordError(updateError.message)
      } else {
        setPasswordSuccess('Password updated successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        
        // Close modal after a delay
        setTimeout(() => {
          setShowPasswordModal(false)
          setPasswordSuccess('')
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error changing password:', error)
      setPasswordError('Failed to update password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      setIsExportingData(true)
      setExportProgress(10)
      
      // Get user profile data
      setExportProgress(20)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single()
      
      if (userError) throw userError
      
      // Get family data if user has a family
      setExportProgress(30)
      let familyData = null
      if (userData.family_id) {
        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', userData.family_id)
          .single()
        
        if (!familyError) {
          familyData = family
        }
      }
      
      // Get family members
      setExportProgress(50)
      let familyMembers = []
      if (userData.family_id) {
        const { data: members, error: membersError } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', userData.family_id)
        
        if (!membersError) {
          familyMembers = members
        }
      }
      
      // Get user's events
      setExportProgress(70)
      let userEvents = []
      if (userData.family_id) {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select(`
            *,
            event_assignments (
              id,
              family_member_id
            )
          `)
          .eq('family_id', userData.family_id)
        
        if (!eventsError) {
          userEvents = events
        }
      }
      
      // Get notification preferences
      setExportProgress(80)
      const { data: notificationPrefs, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      
      // Get marketing consent history
      setExportProgress(90)
      const consentHistory = await getConsentHistory(user!.id)
      
      // Compile all data
      const exportData = {
        user: {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
          marketing_consent: userData.marketing_consent,
          consent_date: userData.consent_date
        },
        family: familyData,
        family_members: familyMembers,
        events: userEvents,
        notification_preferences: notificationPrefs,
        consent_history: consentHistory,
        export_date: new Date().toISOString(),
        export_reason: 'GDPR Data Subject Access Request'
      }
      
      // Convert to JSON and download
      setExportProgress(100)
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `family-scheduler-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setTimeout(() => {
        setIsExportingData(false)
        setExportProgress(0)
      }, 1000)
      
    } catch (error: any) {
      console.error('Error exporting data:', error)
      setError('Failed to export your data. Please try again.')
      setIsExportingData(false)
      setExportProgress(0)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user!.email) {
      setError('Please enter your email correctly to confirm account deletion')
      return
    }
    
    try {
      setSaving(true)
      setError('')
      
      // First, update marketing consent to false (for audit trail)
      await updateMarketingConsent(
        user!.id,
        false,
        'account_deletion'
      )
      
      // Delete user data from database
      // This will cascade to delete all user-related data due to foreign key constraints
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        user!.id
      )
      
      if (deleteError) {
        // If admin delete fails, try user-initiated delete
        const { error: userDeleteError } = await supabase.rpc('delete_user_account')
        
        if (userDeleteError) {
          throw userDeleteError
        }
      }
      
      // Sign out the user
      await signOut()
      
      // Redirect to home page
      navigate('/', { replace: true })
      
    } catch (error: any) {
      console.error('Error deleting account:', error)
      setError('Failed to delete your account. Please contact support.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading your account settings...</p>
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
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Account Settings</h1>
                <p className="text-sm text-gray-600">
                  Manage your account information and privacy settings
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Account Information Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center">
                      <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                        {user?.email}
                      </div>
                      <Button
                        variant="outline"
                        className="ml-2"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Created
                    </label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                      {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type
                    </label>
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                      {userProfile?.role === 'admin' ? 'Family Administrator' : 'Family Member'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Marketing Preferences Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Marketing Preferences</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <MarketingConsentCheckbox
                  checked={marketingConsent}
                  onChange={setMarketingConsent}
                  source="preferences_page"
                />
                
                {/* Consent History Toggle */}
                {consentHistory.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowConsentHistory(!showConsentHistory)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {showConsentHistory ? 'Hide consent history' : 'Show consent history'}
                      <span className="ml-1">{showConsentHistory ? '▲' : '▼'}</span>
                    </button>
                    
                    {/* Consent History */}
                    {showConsentHistory && (
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
                                  {formatConsentDate(record.createdAt)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    record.consentGiven 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {record.consentGiven ? 'Opted in' : 'Opted out'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                  {formatConsentSource(record.source)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={handleSaveConsent}
                    loading={saving}
                    disabled={saving}
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>

            {/* Data & Privacy Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Data & Privacy</h2>
              
              <div className="space-y-4">
                {/* Data Export */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Download className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-800">Export Your Data</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    Download a copy of all your personal data stored in Family Scheduler.
                    This includes your profile, family information, events, and preferences.
                  </p>
                  
                  {isExportingData ? (
                    <div className="space-y-2">
                      <div className="w-full bg-blue-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${exportProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-700 text-center">
                        Exporting your data ({exportProgress}%)...
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleExportData}
                      className="bg-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export My Data
                    </Button>
                  )}
                </div>
                
                {/* Privacy Policy */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <FileText className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="font-medium text-gray-900">Privacy Policy</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Review our privacy policy to understand how we collect, use, and protect your personal data.
                  </p>
                  <a 
                    href="/privacy-policy" 
                    target="_blank"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    View Privacy Policy
                  </a>
                </div>
                
                {/* Account Deletion */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Trash2 className="h-5 w-5 text-red-600 mr-2" />
                    <span className="font-medium text-red-800">Delete Account</span>
                  </div>
                  <p className="text-sm text-red-700 mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button
                    variant="danger"
                    onClick={() => setShowDeleteConfirmation(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete My Account
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setPasswordError('')
          setPasswordSuccess('')
        }}
        title="Change Password"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <Lock className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">Password Security</span>
            </div>
            <p className="text-sm text-blue-600">
              Choose a strong password that you don't use for other accounts.
              We recommend using a combination of uppercase letters, lowercase letters,
              numbers, and special characters.
            </p>
          </div>
          
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            required
          />
          
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter your new password"
            required
          />
          
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            required
          />
          
          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            </div>
          )}
          
          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <p className="text-sm text-green-700">{passwordSuccess}</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setPasswordError('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              loading={saving}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            >
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false)
          setDeleteConfirmText('')
        }}
        title="Delete Account"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">Warning: This action cannot be undone</span>
            </div>
            <p className="text-sm text-red-700">
              Deleting your account will permanently remove all your personal data, including:
            </p>
            <ul className="text-sm text-red-700 mt-2 space-y-1">
              <li>• Your user profile and account information</li>
              <li>• Your family membership and role</li>
              <li>• Events you've created</li>
              <li>• Your notification preferences</li>
              <li>• Your marketing consent history</li>
            </ul>
            <p className="text-sm text-red-700 mt-2">
              If you are the only admin of a family, this will impact other family members.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm by typing your email address
            </label>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={user?.email}
            />
            <p className="text-xs text-gray-500 mt-1">
              Please type your email address ({user?.email}) to confirm deletion
            </p>
          </div>
          
          <div className="pt-4 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmation(false)
                setDeleteConfirmText('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={saving}
              disabled={saving || deleteConfirmText !== user?.email}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}