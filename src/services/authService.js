import { supabase } from '../lib/supabaseClient'

export const authService = {
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
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

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    return { session: data?.session, error }
  },
}
