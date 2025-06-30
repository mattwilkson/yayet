// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    // you can swap this out for your Spinner or any loading UI
    return <div className="flex items-center justify-center h-full">Loading…</div>
  }

  // if there's no user, send them to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // otherwise render the protected content
  return <>{children}</>
}