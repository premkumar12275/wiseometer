import { useState, useRef, useEffect } from 'react'
import { useAccount } from '../../contexts/AccountContext'
import ShareAccountModal from './ShareAccountModal'
import { ChevronsUpDown, Check, Share2, Eye } from 'lucide-react'

// Compact account picker for the sidebar footer: shows the active account and,
// when the user has accounts shared with them, lets them switch. Also opens the
// "share your account" modal.
export default function AccountSwitcher({ user, profile, onSwitch }) {
  const { accounts, activeAccount, isOwnAccount } = useAccount()
  const [open, setOpen] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const owner = { id: user.id, username: profile.username, name: profile.name, email: user.email }
  const activeLabel = isOwnAccount ? 'My account' : (activeAccount.ownerName || `@${activeAccount.ownerUsername}`)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1f2233] transition-colors cursor-pointer"
      >
        <span className="flex-1 truncate text-left">{activeLabel}</span>
        {!isOwnAccount && activeAccount.role === 'viewer' && <Eye size={12} className="text-gray-500 flex-shrink-0" />}
        <ChevronsUpDown size={14} className="text-gray-500 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg shadow-xl py-1 z-10">
          {accounts.map((a) => {
            const isActive = a.ownerId === activeAccount.ownerId
            const mine = a.ownerId === user.id
            return (
              <button
                key={a.ownerId}
                onClick={() => { onSwitch(a.ownerId); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-[#1f2233] cursor-pointer"
              >
                <span className="flex-1 truncate text-left">
                  {mine ? 'My account' : (a.ownerName || `@${a.ownerUsername}`)}
                  {!mine && <span className="text-gray-600"> · {a.role}</span>}
                </span>
                {isActive && <Check size={14} className="text-teal-400 flex-shrink-0" />}
              </button>
            )
          })}
          <div className="border-t border-[#2a2d3a] my-1" />
          <button
            onClick={() => { setShowShare(true); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-[#1f2233] cursor-pointer"
          >
            <Share2 size={14} /> Share my account
          </button>
        </div>
      )}

      {showShare && <ShareAccountModal owner={owner} onClose={() => setShowShare(false)} />}
    </div>
  )
}
