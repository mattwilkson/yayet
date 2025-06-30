// src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from '../ui/Spinner'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({
  children,
  allowWithoutFamily = false
}: {
  children: React.ReactNode
  allowWithoutFamily?: boolean
}) {
  const { user, userProfile, authLoading, profileLoading } = useAuth()

  // 1) still checking auth state? show spinner
  if (authLoading || profileLoading) {
    return <Spinner />
  }

  // 2) not logged in? go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 3) logged in but no family yet, and we're not on the onboarding route
  if (!userProfile?.family_id && !allowWithoutFamily) {
    return <Navigate to="/onboarding" replace />
  }

  // 4) otherwise, render the protected children
  return <>{children}</>
}