import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { assignAdminRole, removeAdminRole } from '../lib/roleManagement'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { ColorPicker } from './ColorPicker'
import { FlexibleDateInput } from './ui/FlexibleDateInput'
import { Shield, Crown, Save, X, AlertTriangle } from 'lucide-react'

interface EditMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member: any | null
  familyId: string
  onUpdate: () => void
  isUserAdmin: boolean
}

const relationshipOptions = [
  { value: '', label: 'Select One' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Grandpa', label: 'Grandpa' },
  { value: 'Grandma', label: 'Grandma' },
  { value: 'Uncle', label: 'Uncle' },
  { value: 'Aunt', label: 'Aunt' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Caregiver', label: 'Caregiver' },
  { value: 'Helper', label: 'Helper' },
  { value: 'Pet Sitter', label: 'Pet Sitter' },
  { value: 'Babysitter', label: 'Babysitter' },
  { value: 'Dog', label: 'Dog' },
  { value: 'Cat', label: 'Cat' },
  { value: 'Other', label: 'Other' },
]

export const EditMemberModal = ({ 
  isOpen, 
  onClose, 
  member, 
  familyId, 
  onUpdate, 
  isUserAdmin 
}: EditMemberModalProps) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [relationship, setRelationship] = useState('')
  const [birthday, setBirthday] = useState('')
  const [anniversary, setAnniversary] = useState('')
  const [address, setAddress] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [role, setRole] = useState<'member' | 'admin'>('member')

  useEffect(() => {
    if (member) {
      console.log('[EditMemberModal] Member data:', {
        id: member.id,
        name: member.name,
        user_id: member.user_id,
        role: member.role,
        currentUserId: user?.id,
        isUserAdmin
      })
      
      setName(member.name || '')
      setNickname(member.nickname || '')
      setRelationship(member.relationship || '')
      setBirthday(member.birthday || '')
      setAnniversary(member.anniversary || '')
      setAddress(member.address || '')
      setColor(member.color || '#3B82F6')
      setRole(member.role || 'member')
    }
  }, [member, user?.id, isUserAdmin])

  const getCategoryFromRelationship = (relationship: string) => {
    const immediateFamilyRelationships = ['Father', 'Mother', 'Son', 'Daughter']
    const extendedFamilyRelationships = ['Grandpa', 'Grandma', 'Uncle', 'Aunt', 'Cousin']
    const petRelationships = ['Dog', 'Cat']
    
    if (immediateFamilyRelationships.includes(relationship)) {
      return 'immediate_family'
    } else if (extendedFamilyRelationships.includes(relationship)) {
      return 'extended_family'
    } else if (petRelationships.includes(relationship)) {
      return 'pet'
    } else {
      return 'caregiver'
    }
  }

  const canChangeRole = (member: any) => {
    console.log('[EditMemberModal] Checking canChangeRole:', {
      memberName: member?.name,
      isWholeFamilyMember: member?.name === 'Whole Family',
      memberUserId: member?.user_id,
      currentUserId: user?.id,
      isSameUser: member?.user_id === user?.id,
      hasUserId: !!member?.user_id
    })
    
    // Can't change role of "Whole Family" member
    if (member?.name === 'Whole Family') {
      console.log('[EditMemberModal] Cannot change role: Whole Family member')
      return false
    }
    
    // Can't change your own role
    if (member?.user_id === user?.id) {
      console.log('[EditMemberModal] Cannot change role: Same user')
      return false
    }
    
    // Must be a registered user (have user_id) to have admin role
    if (!member?.user_id) {
      console.log('[EditMemberModal] Cannot change role: No user_id')
      return false
    }
    
    console.log('[EditMemberModal] ✅ Can change role')
    return true
  }

  const handleRoleChange = async (newRole: 'member' | 'admin') => {
    if (!member || !isUserAdmin || !canChangeRole(member)) return

    console.log('[EditMemberModal] Role change requested:', { 
      memberId: member.id, 
      currentRole: member.role, 
      newRole 
    })

    try {
      setLoading(true)

      let result
      if (newRole === 'admin') {
        result = await assignAdminRole(member.id, familyId)
      } else {
        result = await removeAdminRole(member.id, familyId)
      }

      if (result.success) {
        console.log('[EditMemberModal] ✅ Role change successful')
        setRole(newRole)
        // Don't close modal, just update the role state
        // The parent will refresh data when modal closes
      } else {
        console.error('[EditMemberModal] ❌ Role change failed:', result.error)
        alert(`Failed to ${newRole === 'admin' ? 'assign' : 'remove'} admin role: ${result.error}`)
      }
    } catch (error: any) {
      console.error('[EditMemberModal] ❌ Unexpected error during role change:', error)
      alert(`An unexpected error occurred: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!member) return

    setLoading(true)

    try {
      console.log('[EditMemberModal] Saving member updates...')
      
      const category = getCategoryFromRelationship(relationship)
      
      const updates = {
        name,
        nickname: nickname || null,
        relationship,
        category: category,
        color,
        birthday: birthday || null, // Store as text directly
        anniversary: anniversary || null, // Store as text directly
        address: address || null,
        // Note: role is handled separately through role management functions
      }

      console.log('[EditMemberModal] Update data:', updates)

      const { error } = await supabase
        .from('family_members')
        .update(updates)
        .eq('id', member.id)

      if (error) throw error

      console.log('[EditMemberModal] ✅ Member updated successfully')
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('[EditMemberModal] ❌ Error updating member:', error)
      alert(`Failed to update member: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (member: any) => {
    return member?.nickname && member.nickname.trim() ? member.nickname : member?.name
  }

  const getRoleChangeReason = (member: any) => {
    if (member?.name === 'Whole Family') {
      return 'The "Whole Family" member cannot have admin privileges'
    }
    if (member?.user_id === user?.id) {
      return 'You cannot change your own admin role'
    }
    if (!member?.user_id) {
      return 'Only registered users can be made administrators'
    }
    return null
  }

  if (!member) return null

  const canManageRole = canChangeRole(member)
  const roleChangeReason = getRoleChangeReason(member)

  console.log('[EditMemberModal] Render state:', {
    isUserAdmin,
    canManageRole,
    roleChangeReason,
    memberName: member.name,
    memberUserId: member.user_id,
    currentUserId: user?.id
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${getDisplayName(member)}`}
      size="lg"
    >
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
            disabled={member.name === 'Whole Family'}
          />

          <Input
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter nickname (optional)"
            disabled={member.name === 'Whole Family'}
          />

          <Select
            label="Relationship *"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            options={relationshipOptions}
            disabled={member.name === 'Whole Family'}
          />

          <ColorPicker
            label="Color"
            color={color}
            onChange={setColor}
          />

          <FlexibleDateInput
            label="Birthday"
            value={birthday}
            onChange={setBirthday}
            placeholder="MM/DD or MM/DD/YYYY"
            disabled={member.name === 'Whole Family'}
          />

          <FlexibleDateInput
            label="Anniversary"
            value={anniversary}
            onChange={setAnniversary}
            placeholder="MM/DD or MM/DD/YYYY"
            disabled={member.name === 'Whole Family'}
          />

          <div className="md:col-span-2">
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State 12345"
              disabled={member.name === 'Whole Family'}
            />
          </div>
        </div>

        {/* Admin Role Management Section - Always show if user is admin */}
        {isUserAdmin && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Role Management</h3>
            
            {canManageRole ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Current Role: {role === 'admin' ? 'Administrator' : 'Member'}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {role === 'admin' 
                        ? 'Can manage family members, send invitations, and assign roles'
                        : 'Regular family member with standard access'
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {role === 'member' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRoleChange('admin')}
                        disabled={loading}
                        title="Make Admin"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRoleChange('member')}
                        disabled={loading}
                        title="Remove Admin"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Remove Admin
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">
                      Role Management Not Available
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      {roleChangeReason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !name.trim() || !relationship}
            loading={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}