import { useState, useEffect } from 'react'
import { Shield, X, Check, ExternalLink } from 'lucide-react'
import { Button } from './ui/Button'

interface GDPRConsentBannerProps {
  onAccept: () => void
  onDecline: () => void
  onShowPreferences: () => void
}

export const GDPRConsentBanner = ({ 
  onAccept, 
  onDecline, 
  onShowPreferences 
}: GDPRConsentBannerProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const consentChoice = localStorage.getItem('gdprConsentChoice')
    
    if (!consentChoice) {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('gdprConsentChoice', 'accepted')
    setIsVisible(false)
    onAccept()
  }

  const handleDecline = () => {
    localStorage.setItem('gdprConsentChoice', 'declined')
    setIsVisible(false)
    onDecline()
  }

  const handleShowPreferences = () => {
    setIsVisible(false)
    onShowPreferences()
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg animate-slide-up">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="flex items-start space-x-3 mb-4 sm:mb-0">
            <div className="p-2 bg-blue-100 rounded-full flex-shrink-0 mt-1">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-medium text-gray-900">
                We value your privacy
              </h3>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                We use cookies and similar technologies to provide, protect, and improve our services. 
                {!expanded && (
                  <button 
                    onClick={() => setExpanded(true)}
                    className="text-blue-600 hover:text-blue-800 ml-1 underline"
                  >
                    Learn more
                  </button>
                )}
              </p>
              
              {expanded && (
                <div className="mt-2 text-sm text-gray-600 space-y-2 max-w-2xl">
                  <p>
                    We collect data to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Provide and maintain our services</li>
                    <li>Improve and personalize your experience</li>
                    <li>Communicate with you about your account and our services</li>
                    <li>Ensure the security and proper functioning of our platform</li>
                  </ul>
                  <p>
                    You can manage your preferences at any time through your account settings.
                    For more information, please read our{' '}
                    <a 
                      href="/privacy-policy" 
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                    >
                      Privacy Policy
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 ml-10 sm:ml-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="whitespace-nowrap"
            >
              <X className="h-4 w-4 mr-1" />
              Decline
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowPreferences}
              className="whitespace-nowrap"
            >
              Customize
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="whitespace-nowrap"
            >
              <Check className="h-4 w-4 mr-1" />
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}