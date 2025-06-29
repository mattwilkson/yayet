// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Modal } from './ui/Modal'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, userProfile, loading: authLoading } = useAuth()
  const location = useLocation()

  // 1️⃣ While auth state is loading → show loading modal
  if (authLoading) {
    return (
      <Modal isOpen title="Loading…" size="sm">
        <div className="flex items-center justify-center p-6">
          <p>Loading…</p>
        </div>
      </Modal>
    )
  }

  // 2️⃣ No user → redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3️⃣ User signed in but profile not loaded yet → show loading
  if (user && userProfile === undefined) {
    return (
      <Modal isOpen title="Loading Profile…" size="sm">
        <div className="flex items-center justify-center p-6">
          <p>Loading profile…</p>
        </div>
      </Modal>
    )
  }

  // 4️⃣ Profile loaded, but user hasn’t finished onboarding → redirect
  if (userProfile && userProfile.onboarded === false) {
    return <Navigate to="/onboarding" replace />
  }

  // 5️⃣ Everything’s good → render the protected content
  return <>{children}</>
}