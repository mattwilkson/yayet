// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactElement
  allowWithoutFamily?: boolean
}

export default function ProtectedRoute({
  children,
  allowWithoutFamily = false
}: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  // while we’re checking auth/profile
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // not signed in → send to /auth
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // signed in but no family → send to onboarding
  if (!profile?.family_id && !allowWithoutFamily) {
    return <Navigate to="/onboarding" replace />
  }

  // all good → render the protected child
  return children
}