import { useState, useEffect } from 'react'
import { useSearchParams, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getInvitationByToken, acceptFamilyInvitation, declineFamilyInvitation } from '../lib/invitations'
import { getMemberInvitationByToken, acceptMemberInvitation } from '../lib/memberInvitations'
import { Button } from '../components/ui/Button'
import { Users, Calendar, CheckCircle, XCircle, Clock, Mail, UserCheck } from 'lucide-react'

export const AcceptInvitationPage = () => {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [invitation, setInvitation] = useState<any>(null)
  const [invitationType, setInvitationType] = useState<'general' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [action, setAction] = useState<'accept' | 'decline' | null>(null)

  const token = searchParams.get('token')

  console.log('🎯 AcceptInvitationPage render:', {
    hasToken: !!token,
    hasUser: !!user,
    hasProfile: !!userProfile,
    authLoading,
    loading,
    processing,
    action,
    invitationType
  })

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    if (!authLoading) {
      fetchInvitation()
    }
  }, [token, authLoading])

  const fetchInvitation = async () => {
    if (!token) return

    try {
      console.log('🔍 Fetching invitation details for token:', token)
      setLoading(true)
      setError('')

      // Try to fetch as a general invitation first
      const { success: generalSuccess, invitation: generalInvitation } = await getInvitationByToken(token)
      
      if (generalSuccess && generalInvitation) {
        console.log('✅ General invitation found:', generalInvitation)
        setInvitation(generalInvitation)
        setInvitationType('general')
        setLoading(false)
        return
      }

      // Try to fetch as a member-specific invitation
      const { success: memberSuccess, invitation: memberInvitation } = await getMemberInvitationByToken(token)
      
      if (memberSuccess && memberInvitation) {
        console.log('✅ Member invitation found:', memberInvitation)
        setInvitation(memberInvitation)
        setInvitationType('member')
        setLoading(false)
        return
      }

      // If neither worked, show error
      setError('Invitation not found or expired')
    } catch (err: any) {
      console.error('❌ Error fetching invitation:', err)
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!token || !user || !invitationType) return

    try {
      setProcessing(true)
      setError('')
      setAction('accept')

      console.log('✅ Accepting invitation...', { invitationType })
      
      let result
      if (invitationType === 'general') {
        result = await acceptFamilyInvitation(token)
      } else {
        result = await acceptMemberInvitation(token)
      }

      if (!result.success) {
        setError(result.error || 'Failed to accept invitation')
        return
      }

      console.log('✅ Invitation accepted successfully, family ID:', result.familyId)
      
      if (invitationType === 'member') {
        setSuccess(`Welcome! You are now linked to your family member profile and can access your family calendar.`)
      } else {
        setSuccess('Welcome to the family! You have successfully joined.')
      }
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (err: any) {
      console.error('❌ Error accepting invitation:', err)
      setError('Failed to accept invitation')
    } finally {
      setProcessing(false)
    }
  }

  const handleDeclineInvitation = async () => {
    if (!token || !user) return

    try {
      setProcessing(true)
      setError('')
      setAction('decline')

      console.log('❌ Declining invitation...')
      const { success, error } = await declineFamilyInvitation(token)

      if (!success) {
        setError(error || 'Failed to decline invitation')
        return
      }

      console.log('✅ Invitation declined successfully')
      setSuccess('Invitation declined. Thank you for letting us know.')
    } catch (err: any) {
      console.error('❌ Error declining invitation:', err)
      setError('Failed to decline invitation')
    } finally {
      setProcessing(false)
    }
  }

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} replace />
  }

  // Show loading state while fetching invitation
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading invitation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
            
            <Link 
              to="/dashboard"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Success State */}
            {success && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {action === 'accept' ? 'Welcome to the Family!' : 'Invitation Declined'}
                </h1>
                <p className="text-gray-600 mb-6">{success}</p>
                {action === 'accept' && (
                  <p className="text-sm text-gray-500">
                    Redirecting you to the dashboard...
                  </p>
                )}
              </div>
            )}

            {/* Error State */}
            {error && !success && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  Invitation Error
                </h1>
                <p className="text-red-600 mb-6">{error}</p>
                <Link to="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              </div>
            )}

            {/* Invitation Details */}
            {invitation && !success && !error && (
              <div>
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      {invitationType === 'member' ? (
                        <UserCheck className="h-8 w-8 text-blue-600" />
                      ) : (
                        <Users className="h-8 w-8 text-blue-600" />
                      )}
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    You're Invited!
                  </h1>
                  <p className="text-gray-600">
                    {invitationType === 'member' 
                      ? 'You\'ve been invited to join your family member profile'
                      : 'You\'ve been invited to join a family on Family Scheduler'
                    }
                  </p>
                </div>

                {/* Invitation Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Family</p>
                        <p className="font-medium text-gray-900">
                          {invitation.families?.family_name || 'Family'}
                        </p>
                      </div>
                    </div>
                    
                    {invitationType === 'member' && invitation.family_members && (
                      <div className="flex items-center">
                        <UserCheck className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Your Profile</p>
                          <p className="font-medium text-gray-900">
                            {invitation.family_members.name} ({invitation.family_members.relationship})
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Invited by</p>
                        <p className="font-medium text-gray-900">
                          {invitation.inviter?.email || 'Family Admin'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Expires</p>
                        <p className="font-medium text-gray-900">
                          {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Verification */}
                {user.email !== invitation.invited_email && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-yellow-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Email Mismatch</p>
                        <p className="text-sm text-yellow-700">
                          This invitation was sent to <strong>{invitation.invited_email}</strong>, 
                          but you're logged in as <strong>{user.email}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What Happens Next */}
                {invitationType === 'member' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center mb-2">
                      <UserCheck className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-700">What happens when you accept?</span>
                    </div>
                    <ul className="text-sm text-blue-600 space-y-1">
                      <li>• You'll be linked to your existing family member profile</li>
                      <li>• You can edit your own profile information</li>
                      <li>• You'll see family events and can participate in scheduling</li>
                      <li>• Your account will be associated with this family</li>
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleAcceptInvitation}
                    className="w-full"
                    size="lg"
                    loading={processing && action === 'accept'}
                    disabled={processing || user.email !== invitation.invited_email}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept Invitation
                  </Button>
                  
                  <Button
                    onClick={handleDeclineInvitation}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    loading={processing && action === 'decline'}
                    disabled={processing || user.email !== invitation.invited_email}
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Decline Invitation
                  </Button>
                </div>

                {user.email !== invitation.invited_email && (
                  <p className="text-xs text-gray-500 text-center mt-4">
                    Please log in with the invited email address to accept this invitation.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}