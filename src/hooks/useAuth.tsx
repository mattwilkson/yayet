// File: src/hooks/useAuth.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  family_id?: string
  role?: string
  // …other profile fields…
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

  // listen to auth state change
  useEffect(() => {
    const session = supabase.auth.session()
    setUser(session?.user ?? null)

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    return () => {
      listener?.unsubscribe()
    }
  }, [])

  // fetch profile after user is set
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('family_members')      // or your actual profiles table
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setUserProfile(data as UserProfile)
        }
      })
      .finally(() => setLoading(false))
  }, [user])

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