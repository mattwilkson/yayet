// File: src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'

import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public landing & auth */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Onboarding: allowWithoutFamily shows this for brand-new users */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowWithoutFamily={true}>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* All other routes require a family */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}