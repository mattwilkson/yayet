// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import Spinner from '../ui/Spinner'      // default export
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

  // still loading initial auth state?
  if (loadingAuth || loadingProfile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // not signed in
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // if user has no family yet and this route isn't allowed for that
  if (!userProfile?.family_id && !allowWithoutFamily) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}