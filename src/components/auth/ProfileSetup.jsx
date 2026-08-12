import { useState } from 'react'
import { authService } from '../../services/authService'
import { validateUsername, normalizeUsername } from '../../utils/username'
import { TrendingUp } from 'lucide-react'

// Shown to a signed-in user who has no profile yet (existing accounts that
// predate the profiles table). Collects a username + display name.
export default function ProfileSetup({ user, onDone }) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const uname = normalizeUsername(username)
    const formatErr = validateUsername(uname)
    if (formatErr) { setError(formatErr); return }
    if (!name.trim()) { setError('Enter your name.'); return }

    setLoading(true)
    const { available, error: checkErr } = await authService.checkUsername(uname)
    if (checkErr) { setError(checkErr.message); setLoading(false); return }
    if (!available) { setError('That username is taken.'); setLoading(false); return }

    const { error: createErr } = await authService.createProfile({
      id: user.id,
      username: uname,
      name: name.trim(),
      email: user.email,
    })
    setLoading(false)
    if (createErr) { setError(createErr.message); return }
    onDone()
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-teal-400/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-teal-400" />
          </div>
          <span className="text-xl font-bold text-white">Wiseometer</span>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Finish your profile</h1>
          <p className="text-gray-500 text-sm mb-6">
            Pick a username and name so others can share with you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. prem"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Prem Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
