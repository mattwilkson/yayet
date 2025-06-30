import React from 'react'
import { Navigate } from 'react-router-dom'
import Spinner from '../ui/Spinner'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowWithoutFamily?: boolean
}

function ProtectedRoute({ children, allowWithoutFamily = false }: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()

  // still checking session?
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  // not logged in → login
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // if they have no family and we don't explicitly allow it, go to onboarding
  if (!allowWithoutFamily && !userProfile?.family_id) {
    return <Navigate to="/onboarding" replace />
  }

  // all good!
  return <>{children}</>
}

export default ProtectedRoute