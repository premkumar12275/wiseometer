// Username rules (kept in sync with the DB check constraint in
// supabase/migrations/0004_profiles_and_usernames.sql): 3–20 chars, lowercase
// letters, digits, and underscore.

export const normalizeUsername = (u) => (u || '').trim().toLowerCase()

export function validateUsername(u) {
  const v = normalizeUsername(u)
  if (!v) return 'Choose a username.'
  if (!/^[a-z0-9_]{3,20}$/.test(v)) return 'Use 3–20 lowercase letters, numbers, or underscores.'
  return null
}
