import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Copy, Check, Mail, ExternalLink, X, AlertTriangle } from 'lucide-react'

interface InvitationLinkModalProps {
  isOpen: boolean
  onClose: () => void
  invitationToken: string
  memberName?: string
  invitedEmail?: string
  type: 'general' | 'member'
}

export const InvitationLinkModal = ({ 
  isOpen, 
  onClose, 
  invitationToken, 
  memberName, 
  invitedEmail,
  type 
}: InvitationLinkModalProps) => {
  const [copied, setCopied] = useState(false)
  const [invitationLink, setInvitationLink] = useState('')

  useEffect(() => {
    if (invitationToken) {
      // For development/preview, use the current origin
      // For production, this will be your actual domain
      const baseUrl = window.location.origin
      const link = `${baseUrl}/accept-invitation?token=${invitationToken}`
      setInvitationLink(link)
    }
  }, [invitationToken])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = invitationLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(
      type === 'member' 
        ? `You're invited to join your family profile on Family Scheduler`
        : `You're invited to join our family on Family Scheduler`
    )
    
    const body = encodeURIComponent(
      type === 'member' && memberName
        ? `Hi ${memberName},\n\nYou've been invited to join your family member profile on Family Scheduler!\n\nClick the link below to accept and create your account:\n\n${invitationLink}\n\nThis invitation expires in 24 hours.\n\nBest regards,\nYour Family`
        : `Hi,\n\nYou've been invited to join our family on Family Scheduler!\n\nClick the link below to accept and create your account:\n\n${invitationLink}\n\nThis invitation expires in 24 hours.\n\nBest regards,\nYour Family`
    )
    
    window.open(`mailto:${invitedEmail || ''}?subject=${subject}&body=${body}`)
  }

  const handleTestInSameTab = () => {
    // For testing in development, open in the same tab
    window.location.href = invitationLink
  }

  const isPreviewEnvironment = window.location.hostname.includes('webcontainer') || 
                              window.location.hostname.includes('stackblitz') ||
                              window.location.hostname.includes('bolt.new')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invitation Link Ready"
      size="md"
    >
      <div className="p-6 space-y-6">
        {/* Success Message */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Invitation Created Successfully!
          </h3>
          <p className="text-gray-600">
            {type === 'member' && memberName
              ? `The invitation for ${memberName} is ready to share.`
              : 'Your family invitation is ready to share.'
            }
          </p>
        </div>

        {/* Preview Environment Warning */}
        {isPreviewEnvironment && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-800">Development Environment</span>
            </div>
            <p className="text-sm text-yellow-700">
              You're in a preview environment. For testing, use "Test in Same Tab" below, 
              or deploy the app to test invitation links properly.
            </p>
          </div>
        )}

        {/* Invitation Details */}
        {(memberName || invitedEmail) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Invitation Details</h4>
            <div className="text-sm text-blue-600 space-y-1">
              {memberName && <p><strong>For:</strong> {memberName}</p>}
              {invitedEmail && <p><strong>Email:</strong> {invitedEmail}</p>}
              <p><strong>Expires:</strong> 24 hours from now</p>
            </div>
          </div>
        )}

        {/* Invitation Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invitation Link
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono break-all">
              {invitationLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={copied ? 'bg-green-50 border-green-300 text-green-700' : ''}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {copied && (
            <p className="text-sm text-green-600 mt-1">✓ Link copied to clipboard!</p>
          )}
        </div>

        {/* Sharing Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Share this invitation:</h4>
          
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              onClick={handleEmailShare}
              className="justify-start"
            >
              <Mail className="h-4 w-4 mr-2" />
              Share via Email
            </Button>
            
            {isPreviewEnvironment ? (
              <Button
                variant="outline"
                onClick={handleTestInSameTab}
                className="justify-start bg-blue-50 border-blue-300 text-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Test in Same Tab (Development)
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => window.open(invitationLink, '_blank')}
                className="justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Link in New Tab
              </Button>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Important Notes:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Share this link securely with the intended person</li>
            <li>• The invitation expires in 24 hours</li>
            <li>• Once accepted, the link cannot be used again</li>
            <li>• You can resend or cancel this invitation from the Family Management page</li>
            {isPreviewEnvironment && (
              <li>• <strong>For production use, deploy this app to a proper domain</strong></li>
            )}
          </ul>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <Button onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}