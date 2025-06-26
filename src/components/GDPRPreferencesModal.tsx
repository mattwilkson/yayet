import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Shield, Check, X, Cookie, Bell, Mail, FileText, ExternalLink } from 'lucide-react'

interface GDPRPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (preferences: GDPRPreferences) => void
  initialPreferences?: GDPRPreferences
}

export interface GDPRPreferences {
  necessary: boolean // Always true, can't be disabled
  functional: boolean
  analytics: boolean
  marketing: boolean
}

export const GDPRPreferencesModal = ({
  isOpen,
  onClose,
  onSave,
  initialPreferences = {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false
  }
}: GDPRPreferencesModalProps) => {
  const [preferences, setPreferences] = useState<GDPRPreferences>(initialPreferences)

  const handleSave = () => {
    localStorage.setItem('gdprConsentChoice', 'customized')
    localStorage.setItem('gdprPreferences', JSON.stringify(preferences))
    onSave(preferences)
    onClose()
  }

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    }
    setPreferences(allAccepted)
    localStorage.setItem('gdprConsentChoice', 'accepted')
    localStorage.setItem('gdprPreferences', JSON.stringify(allAccepted))
    onSave(allAccepted)
    onClose()
  }

  const handleRejectAll = () => {
    const allRejected = {
      necessary: true, // Always true
      functional: false,
      analytics: false,
      marketing: false
    }
    setPreferences(allRejected)
    localStorage.setItem('gdprConsentChoice', 'declined')
    localStorage.setItem('gdprPreferences', JSON.stringify(allRejected))
    onSave(allRejected)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Preferences"
      size="lg"
    >
      <div className="p-6 space-y-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-full flex-shrink-0 mt-1">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Manage Your Privacy Settings
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Customize how we process your data. You can change these settings at any time.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Necessary Cookies - Always enabled */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Cookie className="h-5 w-5 text-gray-600 mr-2" />
                <span className="font-medium text-gray-900">Necessary</span>
              </div>
              <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                Required
              </div>
            </div>
            <p className="text-sm text-gray-600">
              These cookies are essential for the website to function properly and cannot be disabled.
              They enable basic functions like page navigation, secure areas, and remembering your login session.
            </p>
          </div>

          {/* Functional Cookies */}
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-600 mr-2" />
                <span className="font-medium text-gray-900">Functional</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.functional}
                  onChange={() => setPreferences({
                    ...preferences,
                    functional: !preferences.functional
                  })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-sm text-gray-600">
              These cookies enable enhanced functionality and personalization.
              They allow us to remember your preferences and settings, such as language preference and display settings.
            </p>
          </div>

          {/* Analytics Cookies */}
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-600 mr-2" />
                <span className="font-medium text-gray-900">Analytics</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.analytics}
                  onChange={() => setPreferences({
                    ...preferences,
                    analytics: !preferences.analytics
                  })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-sm text-gray-600">
              These cookies help us understand how visitors interact with our website.
              They provide information about metrics such as number of visitors, bounce rate, traffic source, etc.
              All information collected is aggregated and anonymous.
            </p>
          </div>

          {/* Marketing Cookies */}
          <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-600 mr-2" />
                <span className="font-medium text-gray-900">Marketing</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={preferences.marketing}
                  onChange={() => setPreferences({
                    ...preferences,
                    marketing: !preferences.marketing
                  })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-sm text-gray-600">
              These cookies are used to track visitors across websites to display relevant advertisements.
              They help us measure the effectiveness of our marketing campaigns and improve our content.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Shield className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-700">Your Privacy Rights</span>
          </div>
          <p className="text-sm text-blue-600">
            Under GDPR and other privacy laws, you have the right to access, correct, delete, and export your personal data.
            You can manage these rights through your account settings at any time.
          </p>
          <div className="mt-2">
            <a 
              href="/privacy-policy" 
              target="_blank"
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
            >
              Read our full Privacy Policy
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-gray-200">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
            >
              <X className="h-4 w-4 mr-1" />
              Reject All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptAll}
            >
              <Check className="h-4 w-4 mr-1" />
              Accept All
            </Button>
          </div>
          
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </Modal>
  )
}