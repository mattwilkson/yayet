// File: src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthProvider from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import AuthPage from './pages/AuthPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* public */}
          <Route path="/auth" element={<AuthPage />} />

          {/* onboarding: only allowed if no family */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowWithoutFamily>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* dashboard: must be logged in & have a family */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App