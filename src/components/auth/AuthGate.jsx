import { useState } from 'react'
import { authService } from '../../services/authService'
import { validateUsername, normalizeUsername } from '../../utils/username'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'

export default function AuthGate({ children, user }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (user) return children

  const switchMode = (m) => { setMode(m); setError(''); setMessage('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'forgot') {
      setLoading(true)
      const { error: err } = await authService.resetPassword(email)
      if (err) setError(err.message)
      else setMessage('Check your email for a password reset link.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      setLoading(true)
      const { error: err } = await authService.signIn(email, password)
      if (err) setError(err.message)
      setLoading(false)
      return
    }

    // Signup: validate + check username availability before creating the account.
    const uname = normalizeUsername(username)
    const formatErr = validateUsername(uname)
    if (formatErr) { setError(formatErr); return }
    if (!name.trim()) { setError('Enter your name.'); return }

    setLoading(true)
    const { available, error: checkErr } = await authService.checkUsername(uname)
    if (checkErr) { setError(checkErr.message); setLoading(false); return }
    if (!available) { setError('That username is taken.'); setLoading(false); return }

    const { error: err } = await authService.signUp(email, password, { username: uname, name: name.trim() })
    if (err) setError(err.message)
    else setMessage('Check your email to confirm your account.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-teal-400/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-teal-400" />
          </div>
          <span className="text-xl font-bold text-white">Wiseometer</span>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'Welcome' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {mode === 'login'
              ? 'Sign in to your account to continue'
              : mode === 'signup'
              ? 'Start tracking your finances today'
              : "Enter your email and we'll send a reset link."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                    Username
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="prem"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                    Name
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Prem Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-teal-400 text-sm bg-teal-400/10 border border-teal-400/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          {mode === 'forgot' ? (
            <p className="text-center text-sm text-gray-500 mt-5">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                ← Back to sign in
              </button>
            </p>
          ) : (
            <p className="text-center text-sm text-gray-500 mt-5">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
