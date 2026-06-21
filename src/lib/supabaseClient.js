import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function makeStub() {
  const err = new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  const noopAsync = async () => ({ data: null, error: err })
  return {
    auth: {
      signUp: async () => ({ data: null, error: err }),
      signInWithPassword: async () => ({ data: null, error: err }),
      signOut: async () => ({ error: err }),
      getSession: async () => ({ data: { session: null }, error: err }),
      onAuthStateChange: () => ({ data: null }),
    },
    from: () => ({
      select: noopAsync,
      insert: noopAsync,
      update: noopAsync,
      delete: noopAsync,
      gte: () => ({ select: noopAsync }),
      lte: () => ({ select: noopAsync }),
      eq: () => ({ select: noopAsync }),
      order: () => ({ select: noopAsync }),
      range: () => ({ select: noopAsync }),
    }),
    storage: {
      from: () => ({ upload: noopAsync }),
    },
  }
}

let supabase
if (!supabaseUrl || !supabaseAnonKey || !/^https?:\/\//i.test(supabaseUrl)) {
  console.warn('Supabase env not set or invalid. Exporting stub supabase client.')
  supabase = makeStub()
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }
