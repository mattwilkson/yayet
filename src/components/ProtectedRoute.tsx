import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../ui/Spinner'

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

  // still checking auth/profile
  if (loading) {
    return <div className="flex items-center justify-center h-full"><Spinner /></div>
  }

  // not signed in
  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // no family yet
  if (!profile.family_id && !allowWithoutFamily) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}