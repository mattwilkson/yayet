// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
  allowWithoutFamily?: boolean
}

export default function ProtectedRoute({
  children,
  allowWithoutFamily = false,
}: Props) {
  const { user, userProfile, loadingAuth, loadingProfile } = useAuth()

  // show a simple spinner while loading
  if (loadingAuth || loadingProfile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  // not signed in
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // no family yet → onboarding
  if (!userProfile?.family_id && !allowWithoutFamily) {
    return <Navigate to="/onboarding" replace />
  }

  // OK!
  return <>{children}</>
}