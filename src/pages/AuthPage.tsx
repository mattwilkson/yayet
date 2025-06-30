// File: src/hooks/useAuth.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  family_id: string
  role: string
  [key: string]: any
}

interface AuthContextValue {
  user: any | null
  userProfile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  loading: true
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<any | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // 1) On mount, fetch session and listen for changes
  useEffect(() => {
    // initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // subscribe to auth changes
    const { subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 2) Whenever `user` changes, load their profile
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setLoading(false)
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
          console.error('Error loading user profile:', error)
          setUserProfile(null)
        } else {
          setUserProfile(data)
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [user])

  // 3) Show spinner if still loading
  if (loading) {
    return null  /* or your <Spinner /> placeholder */
  }

  // 4) Provide context to the app
  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}