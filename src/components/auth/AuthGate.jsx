import { useState } from 'react'
import { authService } from '../../services/authService'
import { Eye, EyeOff, TrendingUp } from 'lucide-react'

export default function AuthGate({ children, user }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (user) return children

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'login') {
      const { error: err } = await authService.signIn(email, password)
      if (err) setError(err.message)
    } else {
      const { error: err } = await authService.signUp(email, password)
      if (err) setError(err.message)
      else setMessage('Check your email to confirm your account.')
    }
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
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {mode === 'login'
              ? 'Sign in to your account to continue'
              : 'Start tracking your finances today'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
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
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}
              className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
