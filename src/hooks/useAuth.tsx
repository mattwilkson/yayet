// File: src/hooks/useAuth.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  family_id?: string
  role?: string
  // …any other fields you store in family_members…
}

interface AuthContextValue {
  user: any | null
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  loading: true,
  signOut: async () => {}
})

export const useAuth = () => useContext(AuthContext)

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // 1) on mount, fetch initial session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2) subscribe to auth changes
    const { subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      // cleanup listener
      subscription.unsubscribe()
    }
  }, [])

  // 3) whenever user changes, load their profile record
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      return
    }

    setLoading(true)
    supabase
      .from('family_members')       // or your actual profiles table
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setUserProfile(data as UserProfile)
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [user])

  // 4) expose signOut
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider