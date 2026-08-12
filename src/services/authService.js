import { supabase } from '../lib/supabaseClient'

export const authService = {
  // meta carries { username, name } → stored in raw_user_meta_data; a DB trigger
  // turns it into a profile row (works even with email confirmation on).
  signUp: async (email, password, meta) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: meta ? { data: meta } : undefined,
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Sends a reset link that returns to the app; Supabase fires PASSWORD_RECOVERY
  // on arrival, which routes the user to the set-new-password screen.
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { data, error }
  },

  updatePassword: async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    return { data, error }
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    return { session: data?.session, error }
  },

  // Anonymous-safe availability check backing the signup form.
  checkUsername: async (username) => {
    const { data, error } = await supabase.rpc('username_available', { u: username })
    return { available: data === true, error }
  },

  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    return { data, error }
  },

  // Used by ProfileSetup for existing users who predate profiles.
  createProfile: async ({ id, username, name, email }) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id, username, name, email }])
      .select()
      .single()
    return { data, error }
  },
}
