// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
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
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  // not logged in → login
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // no family yet → onboarding
  if (!allowWithoutFamily && !userProfile?.family_id) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute