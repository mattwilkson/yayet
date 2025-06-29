import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  userProfile: Profile | null | undefined  // undefined = "still loading"
  authLoading: boolean
  profileLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({} as any)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null | undefined>(undefined)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    )
    // fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    return () => { listener.subscription.unsubscribe() }
  }, [])

  // whenever user changes, reload profile
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      return
    }
    setProfileLoading(true)
    supabase
      .from('users')
      .select('id,family_id,role')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) throw error
        setUserProfile(data)
      })
      .catch(console.error)
      .finally(() => setProfileLoading(false))
  }, [user])

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, userProfile, authLoading, profileLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}