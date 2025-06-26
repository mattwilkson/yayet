import { useState } from 'react'
import { sendMemberInvitation } from '../lib/memberInvitations'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { InvitationLinkModal } from './InvitationLinkModal'
import { Send, X, Mail, Users } from 'lucide-react'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member: any | null
  onSuccess: () => void
}

export const InviteMemberModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onSuccess 
}: InviteMemberModalProps) => {
  const [email, setEmail] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [invitationToken, setInvitationToken] = useState('')

  const handleSendInvitation = async () => {
    if (!email.trim() || !member) {
      setError('Email address is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { success, error: inviteError, invitation } = await sendMemberInvitation(
        member.id,
        email.trim(),
        personalMessage.trim() || undefined
      )

      if (success && invitation) {
        // Store the invitation token and show the link modal
        setInvitationToken(invitation.token)
        setShowLinkModal(true)
        onSuccess()
      } else {
        setError(inviteError || 'Failed to send invitation')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPersonalMessage('')
    setError('')
    onClose()
  }

  const handleLinkModalClose = () => {
    setShowLinkModal(false)
    setInvitationToken('')
    // Reset form and close main modal
    setEmail('')
    setPersonalMessage('')
    setError('')
    onClose()
  }

  if (!member) return null

  return (
    <>
      <Modal
        isOpen={isOpen && !showLinkModal}
        onClose={handleClose}
        title={`Invite ${member.name} to Join`}
        size="md"
      >
        <div className="p-6 space-y-6">
          {/* Member Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Users className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">Inviting Family Member</span>
            </div>
            <div className="text-sm text-blue-800">
              <p><strong>Name:</strong> {member.name}</p>
              <p><strong>Relationship:</strong> {member.relationship}</p>
              {member.nickname && (
                <p><strong>Nickname:</strong> {member.nickname}</p>
              )}
            </div>
          </div>

          {/* Email Input */}
          <div>
            <Input
              label="Email Address *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter their email address"
              error={error}
            />
          </div>

          {/* Personal Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message (Optional)
            </label>
            <textarea
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder={`Hi ${member.name}, you've been invited to join our family calendar...`}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* What Happens Next */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Mail className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-700">What happens next?</span>
            </div>
            <ul className="text-sm text-green-600 space-y-1">
              <li>• You'll get a shareable invitation link</li>
              <li>• Send the link to {member.name} via email, text, or any messaging app</li>
              <li>• When they accept, they'll be linked to this family member profile</li>
              <li>• They'll have access to edit their own profile information</li>
              <li>• They'll be able to see and participate in family events</li>
              <li>• The invitation expires in 24 hours</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitation}
              loading={loading}
              disabled={!email.trim() || loading}
            >
              <Send className="h-4 w-4 mr-2" />
              Create Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invitation Link Modal */}
      <InvitationLinkModal
        isOpen={showLinkModal}
        onClose={handleLinkModalClose}
        invitationToken={invitationToken}
        memberName={member?.name}
        invitedEmail={email}
        type="member"
      />
    </>
  )
}