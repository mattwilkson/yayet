import { supabase } from './supabase'

interface MemberInvitation {
  id: string
  family_member_id: string
  invited_email: string
  inviter_user_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  expires_at: string
  token: string
  personal_message?: string
}

export interface MemberInvitationWithDetails extends MemberInvitation {
  family_members?: {
    id: string
    name: string
    relationship: string
    family_id: string
  }
  families?: {
    family_name: string
  }
  inviter?: {
    email: string
  }
}

// Generate a secure invitation token
const generateInvitationToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Send invitation to a specific family member
export const sendMemberInvitation = async (
  familyMemberId: string,
  invitedEmail: string,
  personalMessage?: string
): Promise<{ success: boolean; error?: string; invitation?: MemberInvitation }> => {
  try {
    console.log('📧 Sending member invitation:', { familyMemberId, invitedEmail })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get family member details
    const { data: familyMember, error: memberError } = await supabase
      .from('family_members')
      .select('id, name, relationship, family_id, user_id')
      .eq('id', familyMemberId)
      .single()

    if (memberError || !familyMember) {
      return { success: false, error: 'Family member not found' }
    }

    // Check if member is already registered
    if (familyMember.user_id) {
      return { success: false, error: 'This family member is already registered' }
    }

    // Verify user is admin of the family
    const { data: memberData, error: adminError } = await supabase
      .from('family_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('family_id', familyMember.family_id)
      .maybeSingle()

    if (adminError || !memberData || memberData.role !== 'admin') {
      return { success: false, error: 'Only family admins can send invitations' }
    }

    // Check for existing pending invitation for this family member
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status, expires_at')
      .eq('member_id', familyMemberId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvitation && new Date(existingInvitation.expires_at) > new Date()) {
      return { success: false, error: 'A pending invitation already exists for this family member' }
    }

    // Generate invitation token and expiration
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours from now

    // Generate invite token for family member
    const inviteToken = crypto.randomUUID()

    // Update family member with invite token
    const { error: updateMemberError } = await supabase
      .from('family_members')
      .update({ invite_token: inviteToken })
      .eq('id', familyMemberId)

    if (updateMemberError) {
      console.error('❌ Error updating family member with invite token:', updateMemberError)
      return { success: false, error: 'Failed to prepare invitation' }
    }

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        family_id: familyMember.family_id,
        member_id: familyMemberId,
        invited_email: invitedEmail,
        inviter_user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (invitationError) {
      console.error('❌ Error creating invitation:', invitationError)
      return { success: false, error: 'Failed to create invitation' }
    }

    // Get family details for email
    const { data: familyData } = await supabase
      .from('families')
      .select('family_name')
      .eq('id', familyMember.family_id)
      .single()

    // TODO: Send email with invitation link
    // For now, we'll just log the invitation details
    console.log('📧 Member invitation created successfully:', {
      token,
      invitationLink: `${window.location.origin}/accept-invitation?token=${token}`,
      familyName: familyData?.family_name,
      memberName: familyMember.name,
      memberRelationship: familyMember.relationship,
      inviterEmail: user.email,
      personalMessage
    })

    return { success: true, invitation }
  } catch (error: any) {
    console.error('❌ Error sending member invitation:', error)
    return { success: false, error: error.message || 'Failed to send invitation' }
  }
}

// Get invitation by token (for acceptance page)
export const getMemberInvitationByToken = async (
  token: string
): Promise<{ success: boolean; error?: string; invitation?: MemberInvitationWithDetails }> => {
  try {
    console.log('🔍 Getting member invitation by token:', token)

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
        family_members (
          id,
          name,
          relationship,
          family_id
        ),
        families (family_name)
      `)
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (error || !invitation) {
      return { success: false, error: 'Invitation not found or expired' }
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) <= new Date()) {
      // Mark as expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return { success: false, error: 'Invitation has expired' }
    }

    // Get inviter email
    const { data: inviterData } = await supabase
      .from('users')
      .select('email')
      .eq('id', invitation.inviter_user_id)
      .single()

    const invitationWithDetails: MemberInvitationWithDetails = {
      ...invitation,
      inviter: inviterData ? { email: inviterData.email } : undefined
    }

    return { success: true, invitation: invitationWithDetails }
  } catch (error: any) {
    console.error('❌ Error getting member invitation:', error)
    return { success: false, error: error.message || 'Failed to get invitation' }
  }
}

// Accept member invitation
export const acceptMemberInvitation = async (
  token: string
): Promise<{ success: boolean; error?: string; familyId?: string; memberId?: string }> => {
  try {
    console.log('✅ Accepting member invitation:', token)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get invitation details
    const { success, error, invitation } = await getMemberInvitationByToken(token)
    if (!success || !invitation) {
      return { success: false, error: error || 'Invalid invitation' }
    }

    // Verify the invitation email matches the current user's email
    if (invitation.invited_email !== user.email) {
      return { success: false, error: 'This invitation was sent to a different email address' }
    }

    // Check if user is already a member of this family
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('family_id', invitation.family_members?.family_id)
      .maybeSingle()

    if (existingMember) {
      // Update invitation status to accepted
      await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      return { 
        success: true, 
        familyId: invitation.family_members?.family_id,
        memberId: existingMember.id
      }
    }

    // Link the user to the existing family member record
    const { error: linkError } = await supabase
      .from('family_members')
      .update({ 
        user_id: user.id,
        invite_token: null // Clear the invite token
      })
      .eq('id', invitation.member_id)

    if (linkError) {
      console.error('❌ Error linking user to family member:', linkError)
      return { success: false, error: 'Failed to link account to family member profile' }
    }

    // Update user's family_id
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ family_id: invitation.family_members?.family_id })
      .eq('id', user.id)

    if (userUpdateError) {
      console.error('❌ Error updating user family_id:', userUpdateError)
      // Don't fail the invitation acceptance for this
    }

    // Update invitation status to accepted
    const { error: invitationUpdateError } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id)

    if (invitationUpdateError) {
      console.error('❌ Error updating invitation status:', invitationUpdateError)
      // Don't fail the invitation acceptance for this
    }

    console.log('✅ Member invitation accepted successfully')
    return { 
      success: true, 
      familyId: invitation.family_members?.family_id,
      memberId: invitation.member_id
    }
  } catch (error: any) {
    console.error('❌ Error accepting member invitation:', error)
    return { success: false, error: error.message || 'Failed to accept invitation' }
  }
}

// Get invitations for a specific family member
export const getMemberInvitations = async (
  familyMemberId: string
): Promise<{ success: boolean; error?: string; invitations?: MemberInvitationWithDetails[] }> => {
  try {
    console.log('📋 Getting invitations for member:', familyMemberId)

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        family_members (
          id,
          name,
          relationship,
          family_id
        )
      `)
      .eq('member_id', familyMemberId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error getting member invitations:', error)
      return { success: false, error: 'Failed to get invitations' }
    }

    // Get inviter emails for each invitation
    const invitationsWithDetails: MemberInvitationWithDetails[] = []
    
    for (const invitation of invitations || []) {
      const { data: inviterData } = await supabase
        .from('users')
        .select('email')
        .eq('id', invitation.inviter_user_id)
        .single()

      invitationsWithDetails.push({
        ...invitation,
        inviter: inviterData ? { email: inviterData.email } : undefined
      })
    }

    return { success: true, invitations: invitationsWithDetails }
  } catch (error: any) {
    console.error('❌ Error getting member invitations:', error)
    return { success: false, error: error.message || 'Failed to get invitations' }
  }
}

// Cancel member invitation
export const cancelMemberInvitation = async (
  invitationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🚫 Canceling member invitation:', invitationId)

    // Get invitation details to clear family member invite token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('member_id')
      .eq('id', invitationId)
      .single()

    if (invitation?.member_id) {
      // Clear invite token from family member
      await supabase
        .from('family_members')
        .update({ invite_token: null })
        .eq('id', invitation.member_id)
    }

    // Delete the invitation
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      console.error('❌ Error canceling member invitation:', error)
      return { success: false, error: 'Failed to cancel invitation' }
    }

    console.log('✅ Member invitation canceled successfully')
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error canceling member invitation:', error)
    return { success: false, error: error.message || 'Failed to cancel invitation' }
  }
}

// Resend member invitation
export const resendMemberInvitation = async (
  invitationId: string
): Promise<{ success: boolean; error?: string; invitation?: MemberInvitation }> => {
  try {
    console.log('🔄 Resending member invitation:', invitationId)

    // Generate new token and expiration
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours from now

    const { data: invitation, error } = await supabase
      .from('invitations')
      .update({
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error resending member invitation:', error)
      return { success: false, error: 'Failed to resend invitation' }
    }

    // TODO: Send new email with updated invitation link
    console.log('📧 Member invitation resent successfully:', {
      token,
      invitationLink: `${window.location.origin}/accept-invitation?token=${token}`
    })

    return { success: true, invitation }
  } catch (error: any) {
    console.error('❌ Error resending member invitation:', error)
    return { success: false, error: error.message || 'Failed to resend invitation' }
  }
}