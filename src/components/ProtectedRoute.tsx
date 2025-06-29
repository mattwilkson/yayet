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

  // 1️⃣ While auth is loading, show a simple loading modal
  if (authLoading) {
    return (
      <Modal isOpen={true} title="Loading…" size="sm">
        <div className="flex items-center justify-center p-6">
          <p>Loading…</p>
        </div>
      </Modal>
    )
  }

  // 2️⃣ Not signed in → redirect to /login, preserve attempted path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3️⃣ Signed in but not onboarded → send to onboarding flow
  if (userProfile && userProfile.onboarded === false) {
    return <Navigate to="/onboarding" replace />
  }

  // 4️⃣ All good → render the protected content
  return <>{children}</>
}