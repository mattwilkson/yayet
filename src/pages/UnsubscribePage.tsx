import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Calendar, Mail, CheckCircle, X, ArrowLeft, Shield, AlertTriangle } from 'lucide-react'

export const UnsubscribePage = () => {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setLoading(false)
      setError('Invalid unsubscribe link. No token provided.')
    }
  }, [token])

  const verifyToken = async () => {
    try {
      setLoading(true)
      
      // Get user email from token
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('unsubscribe_token', token)
        .single()
      
      if (error || !data) {
        setError('Invalid or expired unsubscribe link.')
        return
      }
      
      setUserEmail(data.email)
    } catch (err) {
      console.error('Error verifying token:', err)
      setError('Failed to verify unsubscribe link.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    try {
      setProcessing(true)
      
      // Call the unsubscribe function
      const { data, error } = await supabase
        .rpc('unsubscribe_by_token', {
          p_token: token
        })
      
      if (error) throw error
      
      if (data) {
        setSuccess(true)
      } else {
        setError('You are already unsubscribed from marketing emails.')
      }
    } catch (err) {
      console.error('Error unsubscribing:', err)
      setError('Failed to process your unsubscribe request. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Verifying your request...</p>
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
            
            <Link 
              to="/"
              className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-12">
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
                  Manage your marketing email subscription
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error ? (
              <div className="text-center py-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Something Went Wrong
                </h2>
                <p className="text-gray-600 mb-6">
                  {error}
                </p>
                <div className="flex justify-center">
                  <Link to="/">
                    <Button>
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </div>
            ) : success ? (
              <div className="text-center py-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Successfully Unsubscribed
                </h2>
                <p className="text-gray-600 mb-2">
                  You have been unsubscribed from marketing emails.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  You will still receive essential account-related emails.
                </p>
                <div className="flex justify-center">
                  <Link to="/">
                    <Button>
                      Return to Home
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center mb-3">
                    <Mail className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="font-medium text-gray-900">Unsubscribe from Marketing Emails</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    You are about to unsubscribe <strong>{userEmail}</strong> from marketing emails.
                  </p>
                  <p className="text-sm text-gray-600">
                    You will still receive essential account-related emails such as:
                  </p>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Account security notifications</li>
                    <li>• Family invitations</li>
                    <li>• Important service updates</li>
                  </ul>
                </div>
                
                <div className="flex justify-between items-center">
                  <Link to="/" className="text-gray-600 hover:text-gray-900">
                    <Button variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </Link>
                  
                  <Button
                    onClick={handleUnsubscribe}
                    loading={processing}
                    disabled={processing}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Unsubscribe
                  </Button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center mb-2">
                    <Shield className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">Privacy Information</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    We respect your privacy and are committed to protecting your personal information.
                    You can update your email preferences at any time from your account settings.
                  </p>
                  <div className="mt-2">
                    <a 
                      href="/privacy-policy" 
                      target="_blank"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View our Privacy Policy
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}