import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Modal } from './ui/Modal'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowWithoutFamily?: boolean
}

export function ProtectedRoute({ children, allowWithoutFamily = false }: ProtectedRouteProps) {
  const { user, userProfile, authLoading, profileLoading } = useAuth()
  const location = useLocation()

  // 1️⃣ While auth state is loading → show loading modal
  if (authLoading || (user && profileLoading)) {
    return (
      <Modal isOpen title="Loading…" size="sm">
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="ml-3">Loading...</p>
        </div>
      </Modal>
    )
  }

  // 2️⃣ No user → redirect to login
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // 3️⃣ User signed in but no family_id → redirect to onboarding
  // (unless allowWithoutFamily is true, which is used for the onboarding route itself)
  if (userProfile && !userProfile.family_id && !allowWithoutFamily) {
    return <Navigate to="/onboarding" replace />
  }

  // 4️⃣ Everything's good → render the protected content
  return <>{children}</>
}