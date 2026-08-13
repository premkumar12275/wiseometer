import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { storageService } from '../services/storageService'

const AccountContext = createContext(null)

/**
 * The "active account" is whose finances the app is currently showing. It
 * defaults to the user's own account and can be switched to any account shared
 * with them. All owner-scoped queries use `ownerId`; writes are gated on `canWrite`.
 */
export function AccountProvider({ user, profile, children }) {
  const ownAccount = useMemo(() => ({
    ownerId: user.id,
    ownerUsername: profile.username,
    ownerName: profile.name,
    ownerEmail: user.email,
    role: 'owner',
  }), [user.id, user.email, profile.username, profile.name])

  const [shared, setShared] = useState([])
  const [activeId, setActiveId] = useState(user.id)

  const loadShared = useCallback(async () => {
    const { data } = await storageService.getAccountShares()
    // Rows where I'm the invitee (owner is someone else) = accounts shared with me.
    const mine = (data || [])
      .filter((s) => s.owner_id && s.owner_id !== user.id)
      .map((s) => ({
        ownerId: s.owner_id,
        ownerUsername: s.owner_username,
        ownerName: s.owner_name,
        ownerEmail: s.owner_email,
        role: s.role,
      }))
    setShared(mine)
  }, [user.id])

  useEffect(() => { loadShared() }, [loadShared])

  const accounts = useMemo(() => [ownAccount, ...shared], [ownAccount, shared])
  const activeAccount = accounts.find((a) => a.ownerId === activeId) || ownAccount

  const value = useMemo(() => ({
    accounts,
    activeAccount,
    ownerId: activeAccount.ownerId,
    role: activeAccount.role,
    canWrite: activeAccount.role !== 'viewer',
    isOwnAccount: activeAccount.ownerId === user.id,
    setActiveAccountId: setActiveId,
    refetchAccounts: loadShared,
  }), [accounts, activeAccount, user.id, loadShared])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within an AccountProvider')
  return ctx
}
