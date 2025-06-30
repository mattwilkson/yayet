// File: src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'

// Your existing landing page:
import { LandingPage } from './pages/LandingPage'

// New auth/onboarding/dashboard pages:
import AuthPage from './pages/AuthPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 1. Root stays your LandingPage */}
          <Route path="/" element={<LandingPage />} />

          {/* 2. Sign-in / signup lives at /auth */}
          <Route path="/auth" element={<AuthPage />} />

          {/* 3. Onboarding (only allowed when you don’t yet have a family) */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowWithoutFamily>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* 4. Actual app dashboard behind auth */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* 5. Everything else falls back to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App