import { supabase } from './supabase'

export interface FamilyMemberWithRole {
  id: string
  family_id: string
  user_id: string | null
  name: string
  relationship: string
  role: 'member' | 'admin'
  category: string
  color: string
  nickname?: string
  birthday?: string
  anniversary?: string
  address?: string
  invite_token?: string | null
  created_at: string
  updated_at: string
}

// Get family members with roles
export const getFamilyMembersWithRoles = async (
  familyId: string
): Promise<{ success: boolean; error?: string; members?: FamilyMemberWithRole[] }> => {
  try {
    console.log('[RoleManagement] Getting family members with roles:', familyId)

    // Check if Supabase client is properly configured
    if (!supabase) {
      console.error('[RoleManagement] ❌ Supabase client not initialized')
      return { success: false, error: 'Database connection not available' }
    }

    // Verify current auth state before making the query
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      console.error('[RoleManagement] ❌ Auth error before query:', authError)
      return { success: false, error: 'Authentication error: ' + authError.message }
    }
    if (!user) {
      console.error('[RoleManagement] ❌ No authenticated user')
      return { success: false, error: 'User not authenticated' }
    }
    console.log('[RoleManagement] ✅ Auth check passed, user:', user.id)

    const { data: members, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('role', { ascending: false }) // Admins first
      .order('name', { ascending: true })

    console.log('[RoleManagement] Query completed:', {
      success: !error,
      memberCount: members?.length || 0,
      error: error?.message
    })

    if (error) {
      console.error('[RoleManagement] ❌ Error getting family members:', error)
      console.error('[RoleManagement] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      
      // Provide more specific error messages
      if (error.message.includes('Failed to fetch')) {
        return { 
          success: false, 
          error: 'Unable to connect to database. Please check your internet connection and Supabase configuration.' 
        }
      }
      
      if (error.message.includes('JWT')) {
        return {
          success: false,
          error: 'Authentication token expired. Please refresh the page and sign in again.'
        }
      }
      
      return { success: false, error: error.message || 'Failed to get family members' }
    }

    console.log('[RoleManagement] ✅ Family members fetched successfully:', members?.length || 0, 'members')
    return { success: true, members: members || [] }
  } catch (error: any) {
    console.error('[RoleManagement] ❌ Unexpected error getting family members:', error)
    console.error('[RoleManagement] Error stack:', error.stack)
    
    // Handle network errors specifically
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return { 
        success: false, 
        error: 'Network error: Unable to connect to the database. Please check your internet connection and Supabase configuration.' 
      }
    }
    
    // Handle auth errors
    if (error.message?.includes('auth') || error.message?.includes('session') || error.message?.includes('JWT')) {
      return {
        success: false,
        error: 'Authentication error: Please refresh the page and sign in again.'
      }
    }
    
    return { success: false, error: error.message || 'Failed to get family members' }
  }
}

// Assign admin role to family member
export const assignAdminRole = async (
  memberId: string,
  familyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[RoleManagement] Assigning admin role:', { memberId, familyId })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[RoleManagement] ❌ User not authenticated:', userError)
      return { success: false, error: 'User not authenticated' }
    }
    console.log('[RoleManagement] ✅ Current user verified:', user.id)

    // Verify current user is admin of the family
    const { data: currentUserMember, error: memberError } = await supabase
      .from('family_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .maybeSingle()

    if (memberError) {
      console.error('[RoleManagement] ❌ Error checking current user role:', memberError)
      return { success: false, error: 'Failed to verify admin permissions: ' + memberError.message }
    }

    if (!currentUserMember || currentUserMember.role !== 'admin') {
      console.error('[RoleManagement] ❌ Current user is not admin:', currentUserMember)
      return { success: false, error: 'Only family admins can assign admin roles' }
    }
    console.log('[RoleManagement] ✅ Current user admin status verified')

    // Update the member's role to admin
    console.log('[RoleManagement] Updating member role to admin...')
    const { error: updateError } = await supabase
      .from('family_members')
      .update({ role: 'admin' })
      .eq('id', memberId)
      .eq('family_id', familyId)

    if (updateError) {
      console.error('[RoleManagement] ❌ Error assigning admin role:', updateError)
      return { success: false, error: updateError.message || 'Failed to assign admin role' }
    }

    console.log('[RoleManagement] ✅ Admin role assigned successfully')
    return { success: true }
  } catch (error: any) {
    console.error('[RoleManagement] ❌ Error assigning admin role:', error)
    console.error('[RoleManagement] Error stack:', error.stack)
    
    // Handle specific error types
    if (error.message?.includes('Failed to fetch')) {
      return { success: false, error: 'Network error: Unable to connect to database' }
    }
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      return { success: false, error: 'Authentication error: Please refresh and sign in again' }
    }
    
    return { success: false, error: error.message || 'Failed to assign admin role' }
  }
}

// Remove admin role from family member
export const removeAdminRole = async (
  memberId: string,
  familyId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('[RoleManagement] Removing admin role:', { memberId, familyId })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[RoleManagement] ❌ User not authenticated:', userError)
      return { success: false, error: 'User not authenticated' }
    }
    console.log('[RoleManagement] ✅ Current user verified:', user.id)

    // Verify current user is admin of the family
    const { data: currentUserMember, error: memberError } = await supabase
      .from('family_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .maybeSingle()

    if (memberError) {
      console.error('[RoleManagement] ❌ Error checking current user role:', memberError)
      return { success: false, error: 'Failed to verify admin permissions: ' + memberError.message }
    }

    if (!currentUserMember || currentUserMember.role !== 'admin') {
      console.error('[RoleManagement] ❌ Current user is not admin:', currentUserMember)
      return { success: false, error: 'Only family admins can remove admin roles' }
    }
    console.log('[RoleManagement] ✅ Current user admin status verified')

    // Check if this would leave the family without any admins
    const { data: adminCount, error: countError } = await supabase
      .from('family_members')
      .select('id', { count: 'exact' })
      .eq('family_id', familyId)
      .eq('role', 'admin')

    if (countError) {
      console.error('[RoleManagement] ❌ Error checking admin count:', countError)
      return { success: false, error: 'Failed to verify admin count: ' + countError.message }
    }

    if ((adminCount?.length || 0) <= 1) {
      console.error('[RoleManagement] ❌ Cannot remove last admin')
      return { success: false, error: 'Cannot remove the last admin from the family. At least one admin must remain.' }
    }
    console.log('[RoleManagement] ✅ Admin count check passed, safe to remove admin')

    // Update the member's role to member
    console.log('[RoleManagement] Updating member role to member...')
    const { error: updateError } = await supabase
      .from('family_members')
      .update({ role: 'member' })
      .eq('id', memberId)
      .eq('family_id', familyId)

    if (updateError) {
      console.error('[RoleManagement] ❌ Error removing admin role:', updateError)
      return { success: false, error: updateError.message || 'Failed to remove admin role' }
    }

    console.log('[RoleManagement] ✅ Admin role removed successfully')
    return { success: true }
  } catch (error: any) {
    console.error('[RoleManagement] ❌ Error removing admin role:', error)
    console.error('[RoleManagement] Error stack:', error.stack)
    
    // Handle specific error types
    if (error.message?.includes('Failed to fetch')) {
      return { success: false, error: 'Network error: Unable to connect to database' }
    }
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      return { success: false, error: 'Authentication error: Please refresh and sign in again' }
    }
    
    return { success: false, error: error.message || 'Failed to remove admin role' }
  }
}

// Check if current user is admin of a family
export const isUserFamilyAdmin = async (
  familyId: string
): Promise<{ success: boolean; error?: string; isAdmin?: boolean }> => {
  try {
    console.log('[RoleManagement] Checking if user is family admin:', familyId)
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('[RoleManagement] ❌ User not authenticated:', userError)
      return { success: false, error: 'User not authenticated' }
    }

    const { data: member, error } = await supabase
      .from('family_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .maybeSingle()

    if (error) {
      console.error('[RoleManagement] ❌ Error checking admin status:', error)
      return { success: true, isAdmin: false }
    }

    const isAdmin = member?.role === 'admin'
    console.log('[RoleManagement] ✅ Admin status check result:', isAdmin)
    return { success: true, isAdmin }
  } catch (error: any) {
    console.error('[RoleManagement] ❌ Error checking admin status:', error)
    return { success: false, error: error.message || 'Failed to check admin status' }
  }
}

// Get admin count for a family
const getFamilyAdminCount = async (
  familyId: string
): Promise<{ success: boolean; error?: string; count?: number }> => {
  try {
    console.log('[RoleManagement] Getting family admin count:', familyId)
    
    const { data, error, count } = await supabase
      .from('family_members')
      .select('id', { count: 'exact' })
      .eq('family_id', familyId)
      .eq('role', 'admin')

    if (error) {
      console.error('[RoleManagement] ❌ Error getting admin count:', error)
      return { success: false, error: 'Failed to get admin count' }
    }

    console.log('[RoleManagement] ✅ Admin count retrieved:', count)
    return { success: true, count: count || 0 }
  } catch (error: any) {
    console.error('[RoleManagement] ❌ Error getting admin count:', error)
    return { success: false, error: error.message || 'Failed to get admin count' }
  }
}