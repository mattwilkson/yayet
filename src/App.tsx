import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { AcceptInvitationPage } from './pages/AcceptInvitationPage'
import { EmailPreferencesPage } from './pages/EmailPreferencesPage'
import { UnsubscribePage } from './pages/UnsubscribePage'
import { NotificationPreferencesPage } from './pages/NotificationPreferencesPage'
import { AccountSettingsPage } from './pages/AccountSettingsPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { TermsOfServicePage } from './pages/TermsOfServicePage'
import { GDPRConsentBanner } from './components/GDPRConsentBanner'
import { GDPRPreferencesModal, GDPRPreferences } from './components/GDPRPreferencesModal'

function App() {
  console.log('🎯 App component rendering')
  
  const [showGDPRModal, setShowGDPRModal] = useState(false)
  const [gdprPreferences, setGdprPreferences] = useState<GDPRPreferences>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false
  })

  // Load GDPR preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('gdprPreferences')
    if (savedPreferences) {
      try {
        setGdprPreferences(JSON.parse(savedPreferences))
      } catch (e) {
        console.error('Error parsing GDPR preferences:', e)
      }
    }
  }, [])

  const handleGDPRAccept = () => {
    const acceptedPreferences = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    }
    setGdprPreferences(acceptedPreferences)
    localStorage.setItem('gdprPreferences', JSON.stringify(acceptedPreferences))
  }

  const handleGDPRDecline = () => {
    const declinedPreferences = {
      necessary: true, // Always needed
      functional: false,
      analytics: false,
      marketing: false
    }
    setGdprPreferences(declinedPreferences)
    localStorage.setItem('gdprPreferences', JSON.stringify(declinedPreferences))
  }

  const handleShowPreferences = () => {
    setShowGDPRModal(true)
  }

  const handleSavePreferences = (preferences: GDPRPreferences) => {
    setGdprPreferences(preferences)
  }
  
  return (
    <div id="app-root" className="min-h-screen">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            
            {/* Invitation acceptance route - requires auth but not family */}
            <Route
              path="/accept-invitation"
              element={
                <ProtectedRoute allowWithoutFamily>
                  <AcceptInvitationPage />
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute allowWithoutFamily>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/email-preferences"
              element={
                <ProtectedRoute>
                  <EmailPreferencesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notification-preferences"
              element={
                <ProtectedRoute>
                  <NotificationPreferencesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account-settings"
              element={
                <ProtectedRoute>
                  <AccountSettingsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Catch all - redirect to landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* GDPR Consent Banner */}
          <GDPRConsentBanner 
            onAccept={handleGDPRAccept}
            onDecline={handleGDPRDecline}
            onShowPreferences={handleShowPreferences}
          />
          
          {/* GDPR Preferences Modal */}
          <GDPRPreferencesModal
            isOpen={showGDPRModal}
            onClose={() => setShowGDPRModal(false)}
            onSave={handleSavePreferences}
            initialPreferences={gdprPreferences}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  )
}

export default App