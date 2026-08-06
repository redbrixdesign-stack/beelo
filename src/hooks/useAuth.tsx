import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { getCurrentUser, signOut as signOutApi } from '../lib/auth'
import { db, type AdvisorDexie } from '../lib/dexie'

type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>> extends { data: { user: infer U } } ? U : null

interface AuthContextType {
  user: SupabaseUser | null
  advisor: AdvisorDexie | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAdvisor: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextType['user']>(null)
  const [advisor, setAdvisor] = useState<AdvisorDexie | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      const currentUser = await getCurrentUser()
      
      if (mounted) {
        setUser(currentUser)
        
        if (currentUser) {
          const advisorData = await db.advisors.where('authUserId').equals(currentUser.id).first()
          if (advisorData) {
            setAdvisor(advisorData)
          }
        }
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const advisorData = await db.advisors.where('authUserId').equals(session.user.id).first()
        setAdvisor(advisorData ?? null)
      } else {
        setAdvisor(null)
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await signOutApi()
    setUser(null)
    setAdvisor(null)
  }

  const refreshAdvisor = async () => {
    if (user) {
      const advisorData = await db.advisors.where('authUserId').equals(user.id).first()
      setAdvisor(advisorData ?? null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, advisor, loading, signOut, refreshAdvisor }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}