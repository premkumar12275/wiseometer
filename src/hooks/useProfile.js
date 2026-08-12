import { useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'

// Loads the current user's profile row (username + name). A missing profile
// means an existing user who predates profiles — the app routes them to
// ProfileSetup to pick a username.
export function useProfile(user) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return }
    setLoading(true)
    const { data } = await authService.getProfile(user.id)
    setProfile(data || null)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  return { profile, loading, refetch: load }
}
