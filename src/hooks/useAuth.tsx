import { useState, useEffect, createContext, useContext } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: any
  loading: boolean
  signIn: (email: string, password: string, keepLoggedIn?: boolean) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  refreshProfile: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  console.log('🔄 AuthProvider render - State:', { 
    loading, 
    hasUser: !!user, 
    hasProfile: !!userProfile,
    profileFamilyId: userProfile?.family_id,
    onboardingComplete: userProfile?.onboarding_complete,
    userId: user?.id,
    profileId: userProfile?.id,
    timestamp: new Date().toISOString()
  })

  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      console.log('📋 Starting profile fetch for user:', userId, 'at', new Date().toISOString())
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout after 10 seconds')), 10000)
      })

      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      const { data: userData, error: userError } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as any

      console.log('📋 Profile fetch result:', {
        success: !userError,
        error: userError?.message,
        errorCode: userError?.code,
        data: userData,
        timestamp: new Date().toISOString()
      })

      if (userError) {
        console.log('⚠️ Profile fetch failed:', userError.message, userError.code)
        
        // If profile doesn't exist, create it
        if (userError.code === 'PGRST116' || userError.message.includes('No rows')) {
          console.log('👤 Creating missing user profile...')
          
          const createProfilePromise = supabase
            .from('users')
            .insert({
              id: userId,
              email: email,
              role: 'immediate_family',
              family_id: null,
              onboarding_complete: false
            })
            .select()
            .single()

          const { data: newProfile, error: insertError } = await Promise.race([
            createProfilePromise,
            timeoutPromise
          ]) as any
          
          console.log('👤 Profile creation result:', {
            success: !insertError,
            error: insertError?.message,
            data: newProfile,
            timestamp: new Date().toISOString()
          })
          
          if (!insertError && newProfile) {
            console.log('✅ Created new profile:', newProfile)
            setUserProfile(newProfile)
            return
          } else {
            console.error('❌ Failed to create profile:', insertError)
          }
        }
        
        // Create a basic profile as fallback
        console.log('📝 Using basic profile fallback')
        const basicProfile = {
          id: userId,
          email: email,
          role: 'immediate_family',
          family_id: null,
          onboarding_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUserProfile(basicProfile)
        return
      }

      console.log('✅ User profile found:', userData)
      setUserProfile(userData)
    } catch (error: any) {
      console.log('❌ Profile fetch error:', error.message, error)
      
      // Create basic profile as fallback
      console.log('📝 Using basic profile fallback after error')
      const basicProfile = {
        id: userId,
        email: email,
        role: 'immediate_family',
        family_id: null,
        onboarding_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      setUserProfile(basicProfile)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      console.log('🔄 Refreshing profile for user:', user.id)
      await fetchUserProfile(user.id, user.email || '')
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth at', new Date().toISOString())
        
        // Add timeout to prevent hanging on getSession
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getSession timeout after 15 seconds')), 15000)
        })

        const sessionPromise = supabase.auth.getSession()
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any
        
        if (!mounted) {
          console.log('🚫 Component unmounted during auth init')
          return
        }

        console.log('📱 Initial session result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          error: error?.message,
          timestamp: new Date().toISOString()
        })

        if (error) {
          console.error('❌ Error getting initial session:', error)
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Found user in session, fetching profile...')
          await fetchUserProfile(session.user.id, session.user.email || '')
        } else {
          console.log('👤 No user in session')
          setUserProfile(null)
        }
        
        console.log('✅ Auth initialization complete at', new Date().toISOString())
        setLoading(false)
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error.message, error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Initialize auth
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('🔄 Auth state change:', {
        event,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      })
      
      // Handle different auth events
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed - keeping existing profile')
        setSession(session)
        return
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out')
        setSession(null)
        setUser(null)
        setUserProfile(null)
        setLoading(false)
        return
      }
      
      // For SIGNED_IN and initial session
      console.log('🔑 Processing sign in event...')
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('🔄 Fetching profile for authenticated user')
        try {
          await fetchUserProfile(session.user.id, session.user.email || '')
        } catch (error) {
          console.error('❌ Error fetching profile during auth change:', error)
        }
      } else {
        setUserProfile(null)
      }
      
      console.log('✅ Auth state change processing complete')
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string, keepLoggedIn: boolean = false) => {
    try {
      console.log('🔑 Starting sign in process for:', email, 'at', new Date().toISOString())
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('🔑 Sign in result:', {
        success: !error,
        error: error?.message,
        timestamp: new Date().toISOString()
      })

      if (keepLoggedIn) {
        localStorage.setItem('keepLoggedIn', 'true')
      } else {
        localStorage.removeItem('keepLoggedIn')
      }

      return { error }
    } catch (error) {
      console.error('❌ Sign in error:', error)
      return { error }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      console.log('📝 Starting sign up process for:', email, 'at', new Date().toISOString())
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      })

      console.log('📝 Sign up result:', {
        success: !error,
        error: error?.message,
        timestamp: new Date().toISOString()
      })
      
      return { error }
    } catch (error) {
      console.error('❌ Sign up error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      console.log('👋 Starting sign out process at', new Date().toISOString())
      localStorage.removeItem('keepLoggedIn')
      const { error } = await supabase.auth.signOut()
      console.log('👋 Sign out result:', {
        success: !error,
        error: error?.message,
        timestamp: new Date().toISOString()
      })
      return { error }
    } catch (error) {
      console.error('❌ Sign out error:', error)
      return { error }
    }
  }

  const value = {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

