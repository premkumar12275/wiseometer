import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../../services/storageService'
import { X, UserPlus, Trash2 } from 'lucide-react'

// Owner-only modal to invite people to a group (by username or email) with a
// viewer/editor role, and manage existing members.
export default function ShareGroupModal({ groupId, groupName, owner, onClose }) {
  const [members, setMembers] = useState([])
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState('viewer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const { data } = await storageService.getGroupShares(groupId)
    setMembers(data || [])
  }, [groupId])

  useEffect(() => { load() }, [load])

  const invite = async (e) => {
    e.preventDefault()
    setError('')
    const id = identifier.trim()
    if (!id) return
    setLoading(true)
    const { error: err } = await storageService.shareGroup({ groupId, identifier: id, role, owner })
    setLoading(false)
    if (err) { setError(err.message); return }
    setIdentifier('')
    setRole('viewer')
    load()
  }

  const changeRole = async (id, r) => { await storageService.updateGroupShareRole(id, r); load() }
  const revoke = async (id) => { await storageService.deleteGroupShare(id); load() }

  const label = (m) => (m.invitee_username ? `@${m.invitee_username}` : m.invitee_email)
  const sub = (m) => m.invitee_name || (m.invitee_id ? m.invitee_email : 'Pending — not signed up yet')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Share “{groupName}”</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 cursor-pointer"><X size={18} /></button>
        </div>

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
        <p className="text-[11px] text-gray-600 mb-4">
          They get access after signing in with that username or email.
        </p>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Not shared with anyone yet.</p>
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
