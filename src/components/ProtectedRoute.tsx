// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Modal } from './ui/Modal'
import { Spinner } from './ui/Spinner'  // or any spinner component you have

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, userProfile, loading: authLoading } = useAuth()
  const location = useLocation()

  // 1. While our Auth hook is fetching user & profile, show a spinner:
  if (authLoading) {
    return (
      <Modal isOpen={true} title="Loading…" size="sm">
        <div className="flex items-center justify-center p-6">
          <Spinner /> {/* or fallback text: <p>Loading…</p> */}
        </div>
      </Modal>
    )
  }

  // 2. If not logged in, send to `/login`, preserving the attempted path:
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. If logged in but not yet onboarded, send to `/onboarding`:
  //    After they finish onboarding, set userProfile.onboarded=true and
  //    they’ll come back here and hit the dashboard.
  if (userProfile && userProfile.onboarded === false) {
    return <Navigate to="/onboarding" replace />
  }

  // 4. Otherwise, render the protected content:
  return <>{children}</>
}