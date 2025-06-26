import { supabase } from './supabase'

interface Invitation {
  id: string
  family_id: string
  invited_email: string
  inviter_user_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  updated_at: string
  expires_at: string
  token: string
  member_id?: string | null
}

export interface InvitationWithDetails extends Invitation {
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

// Send family invitation
export const sendFamilyInvitation = async (
  invitedEmail: string,
  familyId: string,
  personalMessage?: string
): Promise<{ success: boolean; error?: string; invitation?: Invitation }> => {
  try {
    console.log('📧 Sending family invitation:', { invitedEmail, familyId })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Verify user is admin of the family
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .maybeSingle()

    if (memberError || !memberData || memberData.role !== 'admin') {
      return { success: false, error: 'Only family admins can send invitations' }
    }

    // Check if user is already a member of this family
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMember) {
      return { success: false, error: 'User is already a member of this family' }
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status, expires_at')
      .eq('family_id', familyId)
      .eq('invited_email', invitedEmail)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvitation && new Date(existingInvitation.expires_at) > new Date()) {
      return { success: false, error: 'An invitation is already pending for this email address' }
    }

    // Generate invitation token and expiration
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours from now

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        family_id: familyId,
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

    // Get family and inviter details for email
    const { data: familyData } = await supabase
      .from('families')
      .select('family_name')
      .eq('id', familyId)
      .single()

    // TODO: Send email with invitation link
    // For now, we'll just log the invitation details
    console.log('📧 Invitation created successfully:', {
      token,
      invitationLink: `${window.location.origin}/accept-invitation?token=${token}`,
      familyName: familyData?.family_name,
      inviterEmail: user.email,
      personalMessage
    })

    return { success: true, invitation }
  } catch (error: any) {
    console.error('❌ Error sending invitation:', error)
    return { success: false, error: error.message || 'Failed to send invitation' }
  }
}

// Get invitation by token
export const getInvitationByToken = async (
  token: string
): Promise<{ success: boolean; error?: string; invitation?: InvitationWithDetails }> => {
  try {
    console.log('🔍 Getting invitation by token:', token)

    // First get the invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
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

    // Get inviter email from users table
    const { data: inviterData } = await supabase
      .from('users')
      .select('email')
      .eq('id', invitation.inviter_user_id)
      .single()

    // Add inviter data to invitation
    const invitationWithDetails: InvitationWithDetails = {
      ...invitation,
      inviter: inviterData ? { email: inviterData.email } : undefined
    }

    return { success: true, invitation: invitationWithDetails }
  } catch (error: any) {
    console.error('❌ Error getting invitation:', error)
    return { success: false, error: error.message || 'Failed to get invitation' }
  }
}

// Accept family invitation
export const acceptFamilyInvitation = async (
  token: string
): Promise<{ success: boolean; error?: string; familyId?: string }> => {
  try {
    console.log('✅ Accepting family invitation:', token)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get invitation details
    const { success, error, invitation } = await getInvitationByToken(token)
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
      .eq('family_id', invitation.family_id)
      .maybeSingle()

    if (existingMember) {
      // Update invitation status to accepted even if already a member
      await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id)

      return { success: true, familyId: invitation.family_id }
    }

    // Add user to family_members table
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: invitation.family_id,
        user_id: user.id,
        name: user.email?.split('@')[0] || 'New Member', // Default name from email
        relationship: 'Family Member',
        role: 'member',
        category: 'immediate_family'
      })

    if (memberError) {
      console.error('❌ Error adding family member:', memberError)
      return { success: false, error: 'Failed to join family' }
    }

    // Update user's family_id
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ family_id: invitation.family_id })
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

    console.log('✅ Family invitation accepted successfully')
    return { success: true, familyId: invitation.family_id }
  } catch (error: any) {
    console.error('❌ Error accepting invitation:', error)
    return { success: false, error: error.message || 'Failed to accept invitation' }
  }
}

// Decline family invitation
export const declineFamilyInvitation = async (
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('❌ Declining family invitation:', token)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get invitation details
    const { success, error, invitation } = await getInvitationByToken(token)
    if (!success || !invitation) {
      return { success: false, error: error || 'Invalid invitation' }
    }

    // Verify the invitation email matches the current user's email
    if (invitation.invited_email !== user.email) {
      return { success: false, error: 'This invitation was sent to a different email address' }
    }

    // Update invitation status to declined
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'declined' })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('❌ Error declining invitation:', updateError)
      return { success: false, error: 'Failed to decline invitation' }
    }

    console.log('✅ Family invitation declined successfully')
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error declining invitation:', error)
    return { success: false, error: error.message || 'Failed to decline invitation' }
  }
}

// Get family invitations (for admins)
export const getFamilyInvitations = async (
  familyId: string
): Promise<{ success: boolean; error?: string; invitations?: InvitationWithDetails[] }> => {
  try {
    console.log('📋 Getting family invitations:', familyId)

    // First get the invitations
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error getting family invitations:', error)
      return { success: false, error: 'Failed to get invitations' }
    }

    // Get inviter emails for each invitation
    const invitationsWithDetails: InvitationWithDetails[] = []
    
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
    console.error('❌ Error getting family invitations:', error)
    return { success: false, error: error.message || 'Failed to get invitations' }
  }
}

// Cancel invitation
export const cancelInvitation = async (
  invitationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🚫 Canceling invitation:', invitationId)

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (error) {
      console.error('❌ Error canceling invitation:', error)
      return { success: false, error: 'Failed to cancel invitation' }
    }

    console.log('✅ Invitation canceled successfully')
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error canceling invitation:', error)
    return { success: false, error: error.message || 'Failed to cancel invitation' }
  }
}

// Resend invitation (create new token and extend expiration)
export const resendInvitation = async (
  invitationId: string
): Promise<{ success: boolean; error?: string; invitation?: Invitation }> => {
  try {
    console.log('🔄 Resending invitation:', invitationId)

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
      console.error('❌ Error resending invitation:', error)
      return { success: false, error: 'Failed to resend invitation' }
    }

    // TODO: Send new email with updated invitation link
    console.log('📧 Invitation resent successfully:', {
      token,
      invitationLink: `${window.location.origin}/accept-invitation?token=${token}`
    })

    return { success: true, invitation }
  } catch (error: any) {
    console.error('❌ Error resending invitation:', error)
    return { success: false, error: error.message || 'Failed to resend invitation' }
  }
}