import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔧 Supabase Configuration Check:')
console.log('- URL configured:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('- Anon Key configured:', supabaseAnonKey ? '✅ Set' : '❌ Missing')

// Don't log actual values in production for security
if (import.meta.env.DEV) {
  console.log('- URL value:', supabaseUrl || 'UNDEFINED')
  console.log('- Key value (first 20 chars):', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'UNDEFINED')
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!')
  console.error('Expected variables:')
  console.error('- VITE_SUPABASE_URL')
  console.error('- VITE_SUPABASE_ANON_KEY')
  console.error('')
  console.error('📋 To fix this:')
  console.error('1. Copy .env.example to .env')
  console.error('2. Go to your Supabase dashboard (https://app.supabase.com)')
  console.error('3. Select your project')
  console.error('4. Go to Settings > API')
  console.error('5. Copy the "Project URL" and "anon public" key to your .env file')
  console.error('6. Restart your development server')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Check for placeholder values (but exclude the actual project credentials)
if (supabaseUrl.includes('your_actual_supabase_url_here') || 
    supabaseAnonKey.includes('your_actual_supabase_anon_key_here')) {
  console.error('❌ CRITICAL: You are using placeholder Supabase credentials!')
  console.error('Please replace the placeholder values in your .env file with your actual Supabase credentials.')
  console.error('')
  console.error('📋 To fix this:')
  console.error('1. Go to your Supabase dashboard (https://app.supabase.com)')
  console.error('2. Select your project')
  console.error('3. Go to Settings > API')
  console.error('4. Copy the "Project URL" and "anon public" key to your .env file')
  console.error('5. Restart your development server')
  throw new Error('Placeholder Supabase credentials detected. Please update your .env file with actual credentials.')
}

// Validate URL format
try {
  new URL(supabaseUrl)
  console.log('✅ Supabase URL format is valid')
} catch (error) {
  console.error('❌ Invalid Supabase URL format:', supabaseUrl)
  throw new Error('Invalid Supabase URL format')
}

// Validate anon key format (should be a JWT-like string)
if (supabaseAnonKey.length < 100) {
  console.warn('⚠️ Supabase anon key seems too short - might be invalid')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Store session in localStorage for persistence
    storage: window.localStorage
  }
})

// Test connection on initialization with detailed logging
console.log('🔌 Testing Supabase connection...')
supabase.from('holidays').select('count', { count: 'exact', head: true })
  .then(({ error, count }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message)
      console.error('Error details:', error)
      console.error('')
      console.error('💡 This usually means:')
      console.error('1. Your Supabase URL or anon key is incorrect')
      console.error('2. Your Supabase project is not accessible')
      console.error('3. Network connectivity issues')
      console.error('')
      console.error('📋 To fix this:')
      console.error('1. Verify your credentials in the .env file')
      console.error('2. Check your Supabase project status')
      console.error('3. Ensure your project has the required tables')
    } else {
      console.log('✅ Supabase connection test successful')
      console.log('Database accessible, holidays table found')
    }
  })
  .catch(error => {
    console.error('❌ Supabase connection test error:', error)
    console.error('💡 This is likely a network or configuration issue')
  })

// Test auth functionality
console.log('🔐 Testing Supabase auth...')
supabase.auth.getSession()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Auth session test failed:', error)
    } else {
      console.log('✅ Auth system accessible')
      console.log('Current session:', data.session ? 'Active' : 'None')
    }
  })
  .catch(error => {
    console.error('❌ Auth session test error:', error)
  })

// Test RLS policies by attempting a simple query
console.log('🔒 Testing RLS policies...')
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    console.log('🔒 Testing user profile access after sign in...')
    supabase
      .from('users')
      .select('id, email, role, family_id')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ RLS policy test failed:', error.message)
          console.error('Error details:', error)
        } else {
          console.log('✅ RLS policy test successful')
          console.log('User profile accessible:', data)
        }
      })
      .catch(error => {
        console.error('❌ RLS policy test error:', error)
      })
  }
})

type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'immediate_family' | 'extended_family' | 'helper'
          family_id: string | null
          onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: 'admin' | 'immediate_family' | 'extended_family' | 'helper'
          family_id?: string | null
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'immediate_family' | 'extended_family' | 'helper'
          family_id?: string | null
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      families: {
        Row: {
          id: string
          family_name: string
          admin_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_name: string
          admin_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_name?: string
          admin_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          user_id: string | null
          name: string
          relationship: string
          birthday: string | null
          anniversary: string | null
          address: string | null
          nickname: string | null
          category: 'immediate_family' | 'extended_family' | 'caregiver' | 'pet'
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id?: string | null
          name: string
          relationship: string
          birthday?: string | null
          anniversary?: string | null
          address?: string | null
          nickname?: string | null
          category?: 'immediate_family' | 'extended_family' | 'caregiver' | 'pet'
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string | null
          name?: string
          relationship?: string
          birthday?: string | null
          anniversary?: string | null
          address?: string | null
          nickname?: string | null
          category?: 'immediate_family' | 'extended_family' | 'caregiver' | 'pet'
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          family_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          all_day: boolean
          location: string | null
          recurrence_rule: string | null
          created_by_user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          all_day?: boolean
          location?: string | null
          recurrence_rule?: string | null
          created_by_user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          all_day?: boolean
          location?: string | null
          recurrence_rule?: string | null
          created_by_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      event_assignments: {
        Row: {
          id: string
          event_id: string
          family_member_id: string
          is_driver_helper: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          family_member_id: string
          is_driver_helper?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          family_member_id?: string
          is_driver_helper?: boolean
          created_at?: string
        }
      }
      holidays: {
        Row: {
          id: string
          name: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          family_id: string
          invited_email: string
          inviter_user_id: string
          status: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at: string
          updated_at: string
          expires_at: string
          token: string
          member_id: string | null
        }
        Insert: {
          id?: string
          family_id: string
          invited_email: string
          inviter_user_id: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at?: string
          updated_at?: string
          expires_at: string
          token: string
          member_id?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          invited_email?: string
          inviter_user_id?: string
          status?: 'pending' | 'accepted' | 'declined' | 'expired'
          created_at?: string
          updated_at?: string
          expires_at?: string
          token?: string
          member_id?: string | null
        }
      }
    }
  }
}