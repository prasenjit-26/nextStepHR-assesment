import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signUp: (input: { email: string; password: string }) => Promise<void>
  signIn: (input: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
