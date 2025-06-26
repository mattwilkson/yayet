import { supabase } from './supabase'

// Interface for marketing consent data
interface MarketingConsentData {
  userId: string
  email: string
  hasConsent: boolean
  consentDate: string | null
  consentSource: string | null
  unsubscribeToken: string | null
}

// Interface for consent history
interface ConsentHistoryEntry {
  id: string
  userId: string
  action: 'granted' | 'withdrawn' | 'updated'
  consentGiven: boolean
  source: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

// Get user's current marketing consent status
export const getMarketingConsent = async (userId: string): Promise<MarketingConsentData | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, marketing_consent, consent_date, consent_source, unsubscribe_token')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    
    return {
      userId: data.id,
      email: data.email,
      hasConsent: data.marketing_consent || false,
      consentDate: data.consent_date,
      consentSource: data.consent_source,
      unsubscribeToken: data.unsubscribe_token
    }
  } catch (error) {
    console.error('Error getting marketing consent:', error)
    return null
  }
}

// Update user's marketing consent with audit trail
export const updateMarketingConsent = async (
  userId: string,
  consent: boolean,
  source: string
): Promise<boolean> => {
  try {
    // Get client IP for audit trail
    let ipAddress = null
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()
      ipAddress = ipData.ip
    } catch (ipError) {
      console.error('Error getting IP address:', ipError)
      // Continue without IP if fetch fails
    }
    
    // Call the RPC function to update consent with audit trail
    const { data, error } = await supabase.rpc('update_marketing_consent', {
      p_user_id: userId,
      p_consent: consent,
      p_source: source,
      p_ip_address: ipAddress,
      p_user_agent: navigator.userAgent
    })
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('Error updating marketing consent:', error)
    return false
  }
}

// Get user's consent history
export const getConsentHistory = async (userId: string): Promise<ConsentHistoryEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('marketing_consent_audit')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return data.map(entry => ({
      id: entry.id,
      userId: entry.user_id,
      action: entry.action,
      consentGiven: entry.consent_given,
      source: entry.source,
      ipAddress: entry.ip_address,
      userAgent: entry.user_agent,
      createdAt: entry.created_at
    }))
  } catch (error) {
    console.error('Error getting consent history:', error)
    return []
  }
}

// Unsubscribe user using token (for unsubscribe links)
const unsubscribeByToken = async (token: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('unsubscribe_by_token', {
      p_token: token
    })
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error unsubscribing by token:', error)
    return false
  }
}

// Get marketing consent statistics (for admins)
const getMarketingConsentStats = async (): Promise<any> => {
  try {
    const { data, error } = await supabase.rpc('get_marketing_consent_stats')
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error getting marketing consent stats:', error)
    return null
  }
}

// Generate unsubscribe URL for a user
const generateUnsubscribeUrl = (unsubscribeToken: string): string => {
  return `${window.location.origin}/unsubscribe?token=${unsubscribeToken}`
}

// Format consent source for display
export const formatConsentSource = (source: string | null): string => {
  if (!source) return 'Unknown'
  
  switch (source) {
    case 'registration':
      return 'Account Registration'
    case 'onboarding':
      return 'Onboarding Process'
    case 'preferences_page':
      return 'Email Preferences Page'
    case 'unsubscribe_link':
      return 'Unsubscribe Link'
    default:
      return source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' ')
  }
}

// Format consent date for display
export const formatConsentDate = (dateString: string | null): string => {
  if (!dateString) return 'Not available'
  
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}