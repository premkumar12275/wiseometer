import { useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'

// Loads the current user's profile row (username + name). A missing profile
// means an existing user who predates profiles — the app routes them to
// ProfileSetup to pick a username.
export function useProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Keyed on the id, not the user object: a token refresh hands back an
  // equivalent-but-new object, and depending on it would refetch (and blank
  // the app) on every tab focus.
  const userId = user?.id

  const load = useCallback(async () => {
    if (!userId) { setProfile(null); setLoading(false); return }
    setLoading(true)
    const { data } = await authService.getProfile(userId)
    setProfile(data || null)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  return { profile, loading, refetch: load }
}
