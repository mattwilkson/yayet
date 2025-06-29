// File: src/components/ProtectedRoute.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: profileLoading } = useAuth()
  const location = useLocation()

  // 1️⃣ Wait until we know if userProfile is loaded
  if (profileLoading) {
    return null   // or a spinner
  }

  // 2️⃣ If not logged in, send to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3️⃣ If logged in but never onboarded, send to onboarding
  if (userProfile && !userProfile.onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  // 4️⃣ Otherwise, render the requested page
  return <>{children}</>
}