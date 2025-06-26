import { useState } from 'react'
import { Mail, Shield, ExternalLink } from 'lucide-react'

interface MarketingConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  source: string // 'registration' | 'onboarding' | 'preferences'
  className?: string
  showPrivacyLink?: boolean
}

export const MarketingConsentCheckbox = ({ 
  checked, 
  onChange, 
  source,
  className = '',
  showPrivacyLink = true
}: MarketingConsentCheckboxProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const getConsentText = () => {
    switch (source) {
      case 'registration':
        return 'Send me family scheduling tips and product updates via email'
      case 'onboarding':
        return 'Keep me updated with helpful family scheduling tips and product news'
      case 'preferences':
        return 'Receive marketing emails with family scheduling tips and product updates'
      default:
        return 'Send me marketing emails'
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main consent checkbox */}
      <label 
        className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg border transition-all duration-200 ${
          checked 
            ? 'bg-blue-50 border-blue-200 shadow-sm' 
            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
          />
          {checked && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Mail className="h-3 w-3 text-blue-600" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium transition-colors ${
              checked ? 'text-blue-900' : 'text-gray-700'
            }`}>
              {getConsentText()}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              Optional
            </span>
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            We respect your privacy. You can unsubscribe at any time.
          </p>
          
          {/* Privacy policy link */}
          {showPrivacyLink && (
            <div className={`text-xs mt-2 transition-opacity duration-200 ${
              isHovered || checked ? 'opacity-100' : 'opacity-70'
            }`}>
              <a 
                href="/privacy-policy" 
                target="_blank"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                <Shield className="h-3 w-3 mr-1" />
                <span>Privacy Policy</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </div>
      </label>
      
      {/* Additional info when checked */}
      {checked && (
        <div className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <div className="flex items-center mb-1">
            <Mail className="h-3 w-3 text-blue-600 mr-1" />
            <span className="font-medium text-blue-800">What you'll receive:</span>
          </div>
          <ul className="space-y-1 pl-4 list-disc">
            <li>Family organization tips and best practices</li>
            <li>New feature announcements and updates</li>
            <li>Occasional special offers</li>
          </ul>
          <p className="mt-2">
            We'll never spam you or share your information with third parties.
          </p>
        </div>
      )}
    </div>
  )
}