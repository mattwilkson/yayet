import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
  allowWithoutFamily?: boolean
}

export default function ProtectedRoute({ children, allowWithoutFamily = false }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading…</div>
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (!allowWithoutFamily && !profile?.family_id) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}