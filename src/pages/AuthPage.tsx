import { useState, useEffect } from 'react'
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { MarketingConsentCheckbox } from '../components/MarketingConsentCheckbox'
import { Calendar, Users, Mail, Clock, ArrowLeft, Shield, Zap } from 'lucide-react'

export const AuthPage = () => {
  const { user, userProfile, signIn, signUp, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [keepLoggedIn, setKeepLoggedIn] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectPath = searchParams.get('redirect')

  console.log('🎯 AuthPage render - Auth state:', {
    loading,
    hasUser: !!user,
    hasProfile: !!userProfile,
    familyId: userProfile?.family_id,
    onboardingComplete: userProfile?.onboarding_complete,
    submitting,
    redirectPath
  })

  // Pre-fill email from URL params (from landing page)
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
      setIsLogin(false) // If coming from landing page, default to signup
    }
  }, [searchParams])

  // Navigation logic - only redirect when auth & profile have finished loading
  useEffect(() => {
    console.log("AuthPage: user/profile/onboarding", { 
      loading,
      hasUser: !!user, 
      hasProfile: !!userProfile, 
      onboardingComplete: userProfile?.onboarding_complete 
    });
    
    // Only redirect after loading completes and user authenticated
    if (!loading && user && userProfile) {
      if (redirectPath) {
        console.log('✅ Using redirect path:', redirectPath)
        navigate(redirectPath, { replace: true })
      } else if (!userProfile.onboarding_complete) {
        console.log('✅ Redirecting to onboarding - user needs to complete setup')
        navigate('/onboarding', { replace: true })
      } else {
        console.log('✅ Redirecting to dashboard - user setup complete')
        navigate('/dashboard', { replace: true })
      }
    }
  }, [loading, user, userProfile, redirectPath, navigate])

  const getErrorMessage = (error: any) => {
    const errorMessage = error?.message || ''
    
    if (errorMessage.includes('email_not_confirmed') || error?.code === 'email_not_confirmed') {
      return 'Please check your email and click the verification link before signing in.'
    }
    
    if (errorMessage.includes('over_email_send_rate_limit') || error?.code === 'over_email_send_rate_limit') {
      return 'Too many requests sent. Please wait a moment before trying again.'
    }

    if (errorMessage.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.'
    }

    if (errorMessage.includes('User already registered')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    
    return errorMessage
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    console.log(`🔑 Attempting ${isLogin ? 'sign in' : 'sign up'} for:`, email)

    try {
      if (isLogin) {
        // Sign in flow
        const { error } = await signIn(email, password, keepLoggedIn)
        
        if (error) {
          console.error(`❌ Sign in error:`, error)
          setError(getErrorMessage(error))
          setSubmitting(false)
        } else {
          console.log(`✅ Sign in successful`)
          // Redirect handled by useEffect
        }
      } else {
        // Sign up flow
        const { error } = await signUp(email, password)
        
        if (error) {
          console.error(`❌ Sign up error:`, error)
          setError(getErrorMessage(error))
          setSubmitting(false)
        } else {
          console.log(`✅ Sign up successful`)
          
          // Record marketing consent if user opted in
          if (marketingConsent) {
            try {
              // Get client IP for audit trail
              const ipResponse = await fetch('https://api.ipify.org?format=json')
              const ipData = await ipResponse.json()
              const ipAddress = ipData.ip
              
              // Call the RPC function to update consent with audit trail
              await supabase.rpc('update_marketing_consent', {
                p_user_id: user!.id,
                p_consent: true,
                p_source: 'registration',
                p_ip_address: ipAddress,
                p_user_agent: navigator.userAgent
              })
              
              console.log('✅ Marketing consent recorded during registration')
            } catch (consentError) {
              console.error('❌ Error recording marketing consent:', consentError)
              // Don't fail the signup process if consent recording fails
            }
          }
          
          setError('')
          setSubmitting(false)
        }
      }
    } catch (err) {
      console.error('❌ Unexpected auth error:', err)
      setError('An unexpected error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  // Show loading state while auth is being processed
  if (loading) {
    console.log('⏳ AuthPage: Showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Loading...</p>
          <p className="text-gray-500 text-sm mt-2">Checking authentication</p>
        </div>
      </div>
    )
  }

  // Show submitting state only when form is being submitted
  if (submitting && !error) {
    console.log('⏳ AuthPage: Showing submitting state')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">
            {isLogin ? 'Signing you in...' : 'Creating your account...'}
          </p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    )
  }

  const getErrorIcon = () => {
    if (error.includes('check your email')) {
      return <Mail className="h-4 w-4" />
    }
    if (error.includes('wait a moment')) {
      return <Clock className="h-4 w-4" />
    }
    return null
  }

  console.log('🎨 AuthPage: Rendering auth form')

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
            
            <a 
              href="/"
              className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-8">
          {/* Welcome Message */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Welcome Back!' : 'Start Your Free Trial'}
            </h1>
            <p className="mt-2 text-gray-600">
              {isLogin 
                ? 'Sign in to access your family calendar'
                : 'Create your account and get organized in minutes'
              }
            </p>
            {redirectPath && (
              <p className="mt-1 text-sm text-blue-600">
                You'll be redirected after signing in
              </p>
            )}
          </div>

          {/* Auth Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Tab Switcher */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  isLogin
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                }}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  !isLogin
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />

              {!isLogin && (
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              )}

              {isLogin && (
                <div className="flex items-center">
                  <input
                    id="keep-logged-in"
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="keep-logged-in" className="ml-2 block text-sm text-gray-700">
                    Keep me logged in
                  </label>
                </div>
              )}

              {/* Marketing Consent Checkbox - Only for signup */}
              {!isLogin && (
                <div className="pt-2">
                  <MarketingConsentCheckbox
                    checked={marketingConsent}
                    onChange={setMarketingConsent}
                    source="registration"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    {getErrorIcon()}
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={submitting}
                disabled={submitting}
              >
                {isLogin ? 'Sign In' : 'Start Free Trial'}
              </Button>
            </form>

            {/* Additional Info */}
            {!isLogin && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Shield className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-700">30-Day Free Trial</span>
                  </div>
                  <ul className="text-sm text-blue-600 space-y-1">
                    <li>• Full access to all features</li>
                    <li>• No credit card required</li>
                    <li>• Cancel anytime</li>
                  </ul>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            )}

            {isLogin && (
              <div className="mt-6 text-center">
                <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            )}
          </div>

          {/* Benefits Reminder */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Join thousands of families staying organized with Family Scheduler
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}