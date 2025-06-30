// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({
  children,
  allowWithoutFamily = false
}: {
  children: React.ReactNode
  allowWithoutFamily?: boolean
}) {
  const { user, userProfile, authLoading, profileLoading } = useAuth()

  // 1) still checking auth or profile? show a simple loading indicator
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  // 2) not signed in? send to /login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 3) signed in but no family yet? send to /onboarding (unless we explicitly allow it)
  if (!userProfile?.family_id && !allowWithoutFamily) {
    return <Navigate to="/onboarding" replace />
  }

  // 4) all good—render the protected content
  return <>{children}</>
}