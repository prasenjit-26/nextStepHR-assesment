import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

type AuthContextValue = {
  session: Session | null
  user: Session['user'] | null
  isLoading: boolean
  signUp: (input: { email: string; password: string }) => Promise<void>
  signIn: (input: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    async function load() {
      const { data, error } = await supabase.auth.getSession()
      if (!ignore) {
        if (error) {
          setSession(null)
        } else {
          setSession(data.session)
        }
        setIsLoading(false)
      }
    }

    load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession)
        setIsLoading(false)
      },
    )

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signUp: async ({ email, password }) => {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      },
      signIn: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [session, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
