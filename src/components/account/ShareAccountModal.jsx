import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../../services/storageService'
import { X, UserPlus, Trash2 } from 'lucide-react'

// Manage who your whole account is shared with (username/email, viewer/editor).
export default function ShareAccountModal({ owner, onClose, onChanged }) {
  const [members, setMembers] = useState([])
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const { data } = await storageService.getAccountShares()
    setMembers((data || []).filter((s) => s.owner_id === owner.id))
  }, [owner.id])

  useEffect(() => { load() }, [load])

  const invite = async (e) => {
    e.preventDefault()
    setError('')
    const id = identifier.trim()
    if (!id) return
    setLoading(true)
    const { error: err } = await storageService.shareAccount({ identifier: id, role, owner })
    setLoading(false)
    if (err) { setError(err.message); return }
    setIdentifier('')
    setRole('viewer')
    load()
    onChanged?.()
  }

  const changeRole = async (id, r) => { await storageService.updateAccountShareRole(id, r); load(); onChanged?.() }
  const revoke = async (id) => { await storageService.deleteAccountShare(id); load(); onChanged?.() }

  const label = (m) => (m.invitee_username ? `@${m.invitee_username}` : m.invitee_email)
  const sub = (m) => m.invitee_name || (m.invitee_id ? m.invitee_email : 'Pending — not signed up yet')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 fade-in">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">Share your account</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 cursor-pointer"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">People you add can see (and, as editors, change) all your transactions, groups, and categories.</p>

        <form onSubmit={invite} className="flex gap-2 mb-2">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="username or email"
            className="input-field flex-1 text-sm"
            autoFocus
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field text-sm w-24">
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button type="submit" disabled={loading} className="btn-primary text-sm px-3 disabled:opacity-50">
            <UserPlus size={14} />
          </button>
        </form>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <p className="text-[11px] text-gray-600 mb-4">They get access after signing in with that username or email.</p>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Your account isn’t shared with anyone yet.</p>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#1f2233]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{label(m)}</p>
                  <p className="text-xs text-gray-500 truncate">{sub(m)}</p>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value)}
                  className="bg-transparent text-gray-300 text-xs border border-[#2a2d3a] rounded px-1.5 py-1 cursor-pointer"
                >
                  <option value="viewer" className="bg-[#1a1d27]">Viewer</option>
                  <option value="editor" className="bg-[#1a1d27]">Editor</option>
                </select>
                <button onClick={() => revoke(m.id)} className="p-1.5 text-gray-500 hover:text-red-400 cursor-pointer" aria-label="Revoke">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
