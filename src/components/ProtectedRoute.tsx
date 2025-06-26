import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'immediate_family' | 'extended_family' | 'helper'
  allowWithoutFamily?: boolean
}

export const ProtectedRoute = ({ children, requiredRole, allowWithoutFamily = false }: ProtectedRouteProps) => {
  const { user, userProfile, loading } = useAuth()

  console.log('🛡️ ProtectedRoute check:', { 
    loading, 
    hasUser: !!user, 
    hasProfile: !!userProfile,
    familyId: userProfile?.family_id,
    allowWithoutFamily,
    currentPath: window.location.pathname,
    userId: user?.id,
    profileId: userProfile?.id,
    timestamp: new Date().toISOString()
  })

  // Show loading spinner while auth is initializing
  if (loading) {
    console.log('⏳ ProtectedRoute: Still loading auth...')
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

  // If no user, redirect to auth
  if (!user) {
    console.log('❌ No user, redirecting to auth')
    return <Navigate to="/auth" replace />
  }

  // CRITICAL: If we don't have a user profile, wait a bit longer or redirect to auth
  if (!userProfile) {
    console.log('❌ No user profile, redirecting to auth')
    return <Navigate to="/auth" replace />
  }

  // CRITICAL: Ensure profile belongs to the current user
  if (userProfile.id !== user.id) {
    console.log('❌ Profile mismatch, redirecting to auth')
    return <Navigate to="/auth" replace />
  }

  // Check role requirements first
  if (requiredRole && userProfile.role !== requiredRole && userProfile.role !== 'admin') {
    console.log('❌ Insufficient role, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }

  // Handle family setup flow - SIMPLIFIED
  const hasFamily = !!userProfile.family_id
  const currentPath = window.location.pathname
  const isOnOnboardingPage = currentPath === '/onboarding'
  const isDashboardPage = currentPath === '/dashboard'

  console.log('🏠 Family check:', { hasFamily, isOnOnboardingPage, isDashboardPage })

  // CRITICAL: If user has family and is on onboarding, redirect to dashboard
  if (hasFamily && isOnOnboardingPage) {
    console.log('✅ User has family but on onboarding page, redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }

  // CRITICAL: If user doesn't have family and is trying to access dashboard, redirect to onboarding
  if (!hasFamily && isDashboardPage) {
    console.log('❌ No family setup and trying to access dashboard, redirecting to onboarding')
    return <Navigate to="/onboarding" replace />
  }

  // CRITICAL: If user doesn't have family and this route doesn't allow it, redirect to onboarding
  if (!hasFamily && !allowWithoutFamily && !isOnOnboardingPage) {
    console.log('❌ No family_id and not allowed without family, redirecting to onboarding')
    return <Navigate to="/onboarding" replace />
  }

  // Allow access
  console.log('✅ Access granted to protected route')
  return <>{children}</>
}