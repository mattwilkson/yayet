import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Modal } from './ui/Modal'
import { ColorPicker } from './ColorPicker'
import { FlexibleDateInput } from './ui/FlexibleDateInput'
import { EditMemberModal } from './EditMemberModal'
import { InviteMemberModal } from './InviteMemberModal'
import { InvitationLinkModal } from './InvitationLinkModal'
import { 
  sendFamilyInvitation, 
  getFamilyInvitations, 
  cancelInvitation, 
  resendInvitation,
  type InvitationWithDetails 
} from '../lib/invitations'
import { 
  getMemberInvitations,
  cancelMemberInvitation,
  resendMemberInvitation,
  type MemberInvitationWithDetails
} from '../lib/memberInvitations'
import { 
  getFamilyMembersWithRoles, 
  isUserFamilyAdmin,
  type FamilyMemberWithRole 
} from '../lib/roleManagement'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Users, 
  Heart, 
  UserCheck, 
  PawPrint, 
  Mail, 
  Crown, 
  Clock,
  Send,
  RotateCcw,
  AlertTriangle,
  UserPlus,
  Copy,
  ExternalLink
} from 'lucide-react'

interface FamilyManagementProps {
  familyId: string
  onUpdate: () => void
}

const relationshipOptions = [
  { value: '', label: 'Select One', category: 'immediate_family' },
  { value: 'Father', label: 'Father', category: 'immediate_family' },
  { value: 'Mother', label: 'Mother', category: 'immediate_family' },
  { value: 'Son', label: 'Son', category: 'immediate_family' },
  { value: 'Daughter', label: 'Daughter', category: 'immediate_family' },
  { value: 'Grandpa', label: 'Grandpa', category: 'extended_family' },
  { value: 'Grandma', label: 'Grandma', category: 'extended_family' },
  { value: 'Uncle', label: 'Uncle', category: 'extended_family' },
  { value: 'Aunt', label: 'Aunt', category: 'extended_family' },
  { value: 'Cousin', label: 'Cousin', category: 'extended_family' },
  { value: 'Caregiver', label: 'Caregiver', category: 'caregiver' },
  { value: 'Helper', label: 'Helper', category: 'caregiver' },
  { value: 'Pet Sitter', label: 'Pet Sitter', category: 'caregiver' },
  { value: 'Babysitter', label: 'Babysitter', category: 'caregiver' },
  { value: 'Dog', label: 'Dog', category: 'pet' },
  { value: 'Cat', label: 'Cat', category: 'pet' },
  { value: 'Other', label: 'Other', category: 'caregiver' },
]

const categoryConfig = {
  immediate_family: {
    label: 'Immediate Family',
    icon: Users,
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    defaultColor: '#3B82F6'
  },
  extended_family: {
    label: 'Extended Family',
    icon: Heart,
    color: 'purple',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    defaultColor: '#8B5CF6'
  },
  caregiver: {
    label: 'Caregivers & Helpers',
    icon: UserCheck,
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
    defaultColor: '#10B981'
  },
  pet: {
    label: 'Pets',
    icon: PawPrint,
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    defaultColor: '#F59E0B'
  }
}

interface FamilyMember {
  id?: string
  name: string
  nickname?: string
  relationship: string
  category: 'immediate_family' | 'extended_family' | 'caregiver' | 'pet'
  color: string
  birthday?: string
  anniversary?: string
  address?: string
}

export const FamilyManagement = ({ familyId, onUpdate }: FamilyManagementProps) => {
  const [members, setMembers] = useState<FamilyMemberWithRole[]>([])
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([])
  const [memberInvitations, setMemberInvitations] = useState<Record<string, MemberInvitationWithDetails[]>>({})
  const [loading, setLoading] = useState(true)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMemberInviteModal, setShowMemberInviteModal] = useState(false)
  const [showInvitationLinkModal, setShowInvitationLinkModal] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMemberWithRole | null>(null)
  const [invitingMember, setInvitingMember] = useState<FamilyMemberWithRole | null>(null)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [currentInvitationToken, setCurrentInvitationToken] = useState('')
  
  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  
  // Add member form state
  const [newMember, setNewMember] = useState<FamilyMember>({
    name: '',
    nickname: '',
    relationship: '',
    category: 'immediate_family',
    color: '#3B82F6'
  })

  useEffect(() => {
    fetchData()
  }, [familyId])

  const fetchData = async () => {
    console.log('[FamilyManagement] Starting data fetch for family:', familyId)
    setLoading(true)
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[FamilyManagement] Current user:', user?.id)
      setCurrentUserId(user?.id || null)
      
      await Promise.all([
        fetchMembers(),
        fetchInvitations(),
        checkAdminStatus()
      ])
    } catch (error) {
      console.error('[FamilyManagement] Error fetching family data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    console.log('[FamilyManagement] Fetching family members...')
    try {
      const { success, members: memberData, error } = await getFamilyMembersWithRoles(familyId)
      
      if (success && memberData) {
        console.log('[FamilyManagement] ✅ Members fetched successfully:', memberData.length, 'members')
        setMembers(memberData)
        
        // Fetch member-specific invitations for unregistered members
        const unregisteredMembers = memberData.filter(m => !m.user_id)
        const memberInvitationsData: Record<string, MemberInvitationWithDetails[]> = {}
        
        for (const member of unregisteredMembers) {
          const { success: inviteSuccess, invitations: memberInvites } = await getMemberInvitations(member.id)
          if (inviteSuccess && memberInvites) {
            memberInvitationsData[member.id] = memberInvites
          }
        }
        
        setMemberInvitations(memberInvitationsData)
      } else {
        console.error('[FamilyManagement] ❌ Failed to fetch members:', error)
        throw new Error(error || 'Failed to fetch members')
      }
    } catch (error: any) {
      console.error('[FamilyManagement] ❌ Failed to fetch members:', error)
      // Don't throw here to prevent breaking the entire component
    }
  }

  const fetchInvitations = async () => {
    console.log('[FamilyManagement] Fetching invitations...')
    try {
      const { success, invitations: invitationData } = await getFamilyInvitations(familyId)
      if (success && invitationData) {
        console.log('[FamilyManagement] ✅ Invitations fetched successfully:', invitationData.length, 'invitations')
        setInvitations(invitationData)
      }
    } catch (error) {
      console.error('[FamilyManagement] ❌ Failed to fetch invitations:', error)
    }
  }

  const checkAdminStatus = async () => {
    console.log('[FamilyManagement] Checking admin status...')
    try {
      const { success, isAdmin } = await isUserFamilyAdmin(familyId)
      if (success) {
        console.log('[FamilyManagement] ✅ Admin status checked:', isAdmin)
        setIsUserAdmin(isAdmin || false)
      }
    } catch (error) {
      console.error('[FamilyManagement] ❌ Failed to check admin status:', error)
    }
  }

  const getDisplayName = (member: FamilyMemberWithRole) => {
    return member.nickname && member.nickname.trim() ? member.nickname : member.name
  }

  const getCategoryFromRelationship = (relationship: string) => {
    const option = relationshipOptions.find(opt => opt.value === relationship)
    return option?.category || 'immediate_family'
  }

  const getDefaultColorForCategory = (category: string) => {
    return categoryConfig[category as keyof typeof categoryConfig]?.defaultColor || '#3B82F6'
  }

  const formatDateForDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    
    try {
      // Check if it's MM/DD format (no year)
      if (/^\d{2}\/\d{2}$/.test(dateString)) {
        const [month, day] = dateString.split('/')
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`
      }
      
      // Check if it's MM/DD/YYYY format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [month, day, year] = dateString.split('/')
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }
      
      // Handle YYYY-MM-DD format from database (legacy data)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }
      
      // Fallback for other formats
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }
    } catch (error) {
      console.error('Error formatting date for display:', error)
    }
    
    return dateString // Return as-is if parsing fails
  }

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Email address is required')
      return
    }

    setInviteLoading(true)
    setInviteError('')

    try {
      const { success, error, invitation } = await sendFamilyInvitation(
        inviteEmail.trim(),
        familyId,
        inviteMessage.trim() || undefined
      )

      if (success && invitation) {
        // Show the invitation link modal
        setCurrentInvitationToken(invitation.token)
        setShowInvitationLinkModal(true)
        setShowInviteModal(false)
        await fetchInvitations()
      } else {
        setInviteError(error || 'Failed to send invitation')
      }
    } catch (error: any) {
      setInviteError(error.message || 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      const { success } = await cancelInvitation(invitationId)
      if (success) {
        await fetchInvitations()
      }
    } catch (error) {
      console.error('Error canceling invitation:', error)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const { success, invitation } = await resendInvitation(invitationId)
      if (success && invitation) {
        // Show the new invitation link
        setCurrentInvitationToken(invitation.token)
        setShowInvitationLinkModal(true)
        await fetchInvitations()
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
    }
  }

  const handleCancelMemberInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return

    try {
      const { success } = await cancelMemberInvitation(invitationId)
      if (success) {
        await fetchMembers() // Refresh to update member invitations
      }
    } catch (error) {
      console.error('Error canceling member invitation:', error)
    }
  }

  const handleResendMemberInvitation = async (invitationId: string) => {
    try {
      const { success, invitation } = await resendMemberInvitation(invitationId)
      if (success && invitation) {
        // Show the new invitation link
        setCurrentInvitationToken(invitation.token)
        setShowInvitationLinkModal(true)
        await fetchMembers() // Refresh to update member invitations
      }
    } catch (error) {
      console.error('Error resending member invitation:', error)
    }
  }

  const handleInviteMember = (member: FamilyMemberWithRole) => {
    console.log('[FamilyManagement] Invite member clicked:', member.name)
    setInvitingMember(member)
    setShowMemberInviteModal(true)
  }

  const handleMemberInviteSuccess = async () => {
    console.log('[FamilyManagement] Member invitation sent successfully')
    await fetchMembers() // Refresh to show new invitation status
  }

  const handleEditMember = (member: FamilyMemberWithRole) => {
    console.log('[FamilyManagement] Edit member clicked:', {
      id: member.id,
      name: member.name,
      user_id: member.user_id,
      role: member.role,
      currentUserId,
      isUserAdmin
    })
    setEditingMember(member)
    setShowEditModal(true)
  }

  const handleEditModalClose = () => {
    setShowEditModal(false)
    setEditingMember(null)
  }

  const handleEditModalUpdate = async () => {
    console.log('[FamilyManagement] Edit modal update callback')
    await fetchMembers()
    onUpdate()
    handleEditModalClose()
  }

  const handleAddMember = async () => {
    if (!newMember.name.trim() || !newMember.relationship) return

    try {
      const category = getCategoryFromRelationship(newMember.relationship)
      
      const { error } = await supabase
        .from('family_members')
        .insert({
          family_id: familyId,
          name: newMember.name,
          nickname: newMember.nickname || null,
          relationship: newMember.relationship,
          category: category,
          color: newMember.color,
          role: 'member', // New members start as regular members
          birthday: newMember.birthday || null, // Store as text directly
          anniversary: newMember.anniversary || null, // Store as text directly
          address: newMember.address || null,
        })

      if (error) throw error

      await fetchMembers()
      onUpdate()
      setShowAddForm(false)
      setNewMember({ 
        name: '', 
        nickname: '', 
        relationship: '', 
        category: 'immediate_family',
        color: '#3B82F6'
      })
    } catch (error) {
      console.error('Error adding family member:', error)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    
    if (member?.name === 'Whole Family') {
      alert('The "Whole Family" member cannot be deleted as it\'s used for family-wide events.')
      return
    }

    if (!confirm('Are you sure you want to delete this family member?')) return

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      await fetchMembers()
      onUpdate()
    } catch (error) {
      console.error('Error deleting family member:', error)
    }
  }

  const handleRelationshipChange = (relationship: string) => {
    const category = getCategoryFromRelationship(relationship)
    const defaultColor = getDefaultColorForCategory(category)
    setNewMember({ 
      ...newMember, 
      relationship, 
      category: category as any,
      color: defaultColor
    })
  }

  const handleCopyInvitationLink = async (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`
    try {
      await navigator.clipboard.writeText(link)
      alert('Invitation link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy link:', error)
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Invitation link copied to clipboard!')
    }
  }

  const handleOpenInvitationLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`
    window.open(link, '_blank')
  }

  const groupedMembers = members.reduce((groups, member) => {
    const category = member.category || 'immediate_family'
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(member)
    return groups
  }, {} as Record<string, FamilyMemberWithRole[]>)

  const getMemberInvitationStatus = (member: FamilyMemberWithRole) => {
    const invites = memberInvitations[member.id] || []
    const pendingInvite = invites.find(inv => inv.status === 'pending')
    
    if (pendingInvite) {
      return {
        status: 'pending',
        invitation: pendingInvite,
        expires: new Date(pendingInvite.expires_at)
      }
    }
    
    return { status: 'none' }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Family Management</h3>
          
          {/* Tab Navigation */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'members'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="h-4 w-4 mr-1 inline" />
              Members
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'invitations'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="h-4 w-4 mr-1 inline" />
              Invitations
              {invitations.filter(i => i.status === 'pending').length > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {invitations.filter(i => i.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {activeTab === 'members' && isUserAdmin && (
            <Button
              onClick={() => setShowAddForm(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
          
          {activeTab === 'invitations' && isUserAdmin && (
            <Button
              onClick={() => setShowInviteModal(true)}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          )}
        </div>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <>
          {/* Add New Member Form */}
          {showAddForm && isUserAdmin && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-4">Add New Family Member</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  label="Name *"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="Enter full name"
                />
                <Input
                  label="Nickname"
                  value={newMember.nickname || ''}
                  onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
                  placeholder="Enter nickname (optional)"
                />
                <Select
                  label="Relationship *"
                  value={newMember.relationship}
                  onChange={(e) => handleRelationshipChange(e.target.value)}
                  options={relationshipOptions}
                />
                <ColorPicker
                  label="Color"
                  color={newMember.color}
                  onChange={(color) => setNewMember({ ...newMember, color })}
                />
                <FlexibleDateInput
                  label="Birthday"
                  value={newMember.birthday || ''}
                  onChange={(value) => setNewMember({ ...newMember, birthday: value })}
                  placeholder="MM/DD or MM/DD/YYYY"
                />
                <FlexibleDateInput
                  label="Anniversary"
                  value={newMember.anniversary || ''}
                  onChange={(value) => setNewMember({ ...newMember, anniversary: value })}
                  placeholder="MM/DD or MM/DD/YYYY"
                />
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={newMember.address || ''}
                    onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleAddMember}
                  size="sm"
                  disabled={!newMember.name.trim() || !newMember.relationship}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewMember({ 
                      name: '', 
                      nickname: '', 
                      relationship: '', 
                      category: 'immediate_family',
                      color: '#3B82F6'
                    })
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Family Members by Category */}
          <div className="space-y-6">
            {Object.entries(categoryConfig).map(([categoryKey, config]) => {
              const categoryMembers = groupedMembers[categoryKey] || []
              if (categoryMembers.length === 0) return null

              const IconComponent = config.icon

              return (
                <div key={categoryKey} className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}>
                  <div className="flex items-center mb-4">
                    <div className={`p-2 ${config.bgColor} rounded-lg mr-3`}>
                      <IconComponent className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                    <h4 className={`font-semibold ${config.textColor}`}>
                      {config.label} ({categoryMembers.length})
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {categoryMembers.map((member) => {
                      const invitationStatus = getMemberInvitationStatus(member)
                      
                      return (
                        <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                                style={{ backgroundColor: member.color || config.defaultColor }}
                              />
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h5 className="font-medium text-gray-900">
                                    {getDisplayName(member)}
                                  </h5>
                                  {member.nickname && member.nickname.trim() && member.name !== 'Whole Family' && (
                                    <span className="text-sm text-gray-500">
                                      ({member.name})
                                    </span>
                                  )}
                                  {member.role === 'admin' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Admin
                                    </span>
                                  )}
                                  {member.name === 'Whole Family' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Family Events
                                    </span>
                                  )}
                                  {member.user_id === currentUserId && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      You
                                    </span>
                                  )}
                                  {/* Registration Status */}
                                  {member.user_id ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Registered
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      Not Registered
                                    </span>
                                  )}
                                  {/* Invitation Status */}
                                  {invitationStatus.status === 'pending' && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Invitation Pending
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{member.relationship}</p>
                                {(member.birthday || member.anniversary) && member.name !== 'Whole Family' && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {member.birthday && (
                                      <span>Birthday: {formatDateForDisplay(member.birthday)}</span>
                                    )}
                                    {member.birthday && member.anniversary && ' • '}
                                    {member.anniversary && (
                                      <span>Anniversary: {formatDateForDisplay(member.anniversary)}</span>
                                    )}
                                  </div>
                                )}
                                {member.address && member.name !== 'Whole Family' && (
                                  <p className="text-xs text-gray-500 mt-1">{member.address}</p>
                                )}
                                {/* Invitation Details */}
                                {invitationStatus.status === 'pending' && invitationStatus.invitation && (
                                  <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 rounded p-2">
                                    <p>Invited: {invitationStatus.invitation.invited_email}</p>
                                    <p>Expires: {invitationStatus.expires?.toLocaleDateString()}</p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCopyInvitationLink(invitationStatus.invitation!.token)}
                                        className="text-xs py-1 px-2 h-6"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy Link
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenInvitationLink(invitationStatus.invitation!.token)}
                                        className="text-xs py-1 px-2 h-6"
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Open
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {/* Invite Button - Only for unregistered members without pending invitations */}
                              {isUserAdmin && !member.user_id && invitationStatus.status === 'none' && member.name !== 'Whole Family' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleInviteMember(member)}
                                  title="Send Invitation"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Invitation Management - For pending invitations */}
                              {isUserAdmin && invitationStatus.status === 'pending' && invitationStatus.invitation && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResendMemberInvitation(invitationStatus.invitation!.id)}
                                    title="Resend Invitation"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelMemberInvitation(invitationStatus.invitation!.id)}
                                    title="Cancel Invitation"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              
                              {/* Edit/Delete buttons - Only for admins */}
                              {isUserAdmin && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMember(member)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteMember(member.id)}
                                    disabled={member.name === 'Whole Family'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {members.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No family members added yet.</p>
            </div>
          )}
        </>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invitations sent yet.</p>
              {isUserAdmin && (
                <p className="text-sm text-gray-400 mt-2">
                  Send your first invitation to add family members!
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        invitation.status === 'pending' ? 'bg-yellow-100' :
                        invitation.status === 'accepted' ? 'bg-green-100' :
                        invitation.status === 'declined' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        <Mail className={`h-5 w-5 ${
                          invitation.status === 'pending' ? 'text-yellow-600' :
                          invitation.status === 'accepted' ? 'text-green-600' :
                          invitation.status === 'declined' ? 'text-red-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">
                            {invitation.invited_email}
                          </h5>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            invitation.status === 'declined' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <div className="flex items-center space-x-4">
                            <span>Sent {new Date(invitation.created_at).toLocaleDateString()}</span>
                            {invitation.status === 'pending' && (
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Expires {new Date(invitation.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Show invitation link for pending invitations */}
                        {invitation.status === 'pending' && (
                          <div className="mt-2 flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyInvitationLink(invitation.token)}
                              className="text-xs py-1 px-2 h-6"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInvitationLink(invitation.token)}
                              className="text-xs py-1 px-2 h-6"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons for pending invitations */}
                    {invitation.status === 'pending' && isUserAdmin && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvitation(invitation.id)}
                          title="Resend Invitation"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          title="Cancel Invitation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Send Invitation Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          setInviteEmail('')
          setInviteMessage('')
          setInviteError('')
        }}
        title="Send Family Invitation"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <Input
              label="Email Address *"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              error={inviteError}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message (Optional)
            </label>
            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Add a personal message to the invitation..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <Mail className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">What happens next?</span>
            </div>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• You'll get a shareable invitation link</li>
              <li>• Send the link to the person via email, text, or any messaging app</li>
              <li>• They can accept or decline the invitation</li>
              <li>• The invitation expires in 24 hours</li>
              <li>• You can resend or cancel invitations anytime</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteModal(false)
                setInviteEmail('')
                setInviteMessage('')
                setInviteError('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitation}
              loading={inviteLoading}
              disabled={!inviteEmail.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Create Invitation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Member Modal */}
      <EditMemberModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        member={editingMember}
        familyId={familyId}
        onUpdate={handleEditModalUpdate}
        isUserAdmin={isUserAdmin}
      />

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showMemberInviteModal}
        onClose={() => {
          setShowMemberInviteModal(false)
          setInvitingMember(null)
        }}
        member={invitingMember}
        onSuccess={handleMemberInviteSuccess}
      />

      {/* Invitation Link Modal */}
      <InvitationLinkModal
        isOpen={showInvitationLinkModal}
        onClose={() => {
          setShowInvitationLinkModal(false)
          setCurrentInvitationToken('')
          setInviteEmail('')
          setInviteMessage('')
        }}
        invitationToken={currentInvitationToken}
        invitedEmail={inviteEmail}
        type="general"
      />

      {/* Admin Notice */}
      {!isUserAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Limited Access</p>
              <p className="text-sm text-yellow-700">
                Only family administrators can add members, send invitations, and manage roles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}