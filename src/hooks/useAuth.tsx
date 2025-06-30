import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  family_id: string | null
  // …any other fields you use…
}

interface AuthContextType {
  user: any
  userProfile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = supabase.auth.session()
    if (session) setUser(session.user)

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setLoading(false)
      return
    }

    supabase
      .from('family_members')
      .select('id, family_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserProfile(
          data
            ? { id: data.id, family_id: data.family_id }
            : { id: user.id, family_id: null }
        )
      })
      .finally(() => setLoading(false))
  }, [user])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}