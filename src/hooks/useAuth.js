import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // Arriving via a password-reset link — show the set-new-password screen.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)

      // Supabase re-fires SIGNED_IN / TOKEN_REFRESHED every time the tab
      // regains focus or the access token rotates, handing back a NEW user
      // object for the same person. Swapping it in changes the identity every
      // consumer keys off, which remounts the whole workspace and throws away
      // the current page, filters and month. Keep the existing object unless
      // the signed-in identity actually changed (USER_UPDATED carries real
      // profile/email changes, so always take that one).
      const next = session?.user ?? null
      setUser((prev) =>
        event !== 'USER_UPDATED' && prev && next && prev.id === next.id ? prev : next
      )
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const clearRecovery = () => setRecovery(false)

  return { user, loading, recovery, clearRecovery }
}
