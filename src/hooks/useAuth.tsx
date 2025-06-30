// File: src/hooks/useAuth.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  email: string
  family_id: string | null
  role: string
  // …any other fields you need
}

interface AuthContextType {
  session: any
  user: { id: string; email: string } | null
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // initial check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, data) => {
        setSession(data.session)
        setUser(data.session?.user ?? null)
      }
    )

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  // load profile when user changes
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      return
    }

    setLoading(true)
    supabase
      .from<UserProfile>('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error loading profile:', error)
          // if missing profile, redirect to onboarding
          navigate('/onboarding', { replace: true })
        } else {
          setUserProfile(data)
        }
      })
      .finally(() => setLoading(false))
  }, [user, navigate])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setUserProfile(null)
    navigate('/auth', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ session, user, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}