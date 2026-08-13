import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

// Groups shown for the ACTIVE account. When viewing your own account you also
// see groups individually shared with you (Phase 1). Each group is annotated
// with `access`: 'owner' | 'editor' | 'viewer'.
export function useGroups(user, activeAccount) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const ownerId = activeAccount?.ownerId
  const isOwn = ownerId === user?.id

  const fetchGroups = useCallback(async () => {
    if (!user || !ownerId) { setGroups([]); setLoading(false); return }
    setLoading(true)
    const [{ data: all }, { data: myShares }] = await Promise.all([
      storageService.getGroups(),
      storageService.getMyGroupShares(),
    ])
    const shareByGroup = {}
    for (const s of myShares || []) shareByGroup[s.group_id] = s

    const accountRole = activeAccount.role === 'owner' ? 'owner' : activeAccount.role
    const primary = (all || [])
      .filter((g) => g.user_id === ownerId)
      .map((g) => ({
        ...g,
        access: accountRole,
        shared: !isOwn,
        ownerName: isOwn ? undefined : activeAccount.ownerName,
        ownerUsername: isOwn ? undefined : activeAccount.ownerUsername,
      }))

    // Individually group-shared groups only surface on the user's own account.
    let extras = []
    if (isOwn) {
      extras = (all || [])
        .filter((g) => g.user_id !== user.id && shareByGroup[g.id])
        .map((g) => ({
          ...g,
          access: shareByGroup[g.id].role,
          shared: true,
          ownerName: shareByGroup[g.id].owner_name,
          ownerUsername: shareByGroup[g.id].owner_username,
        }))
    }

    setGroups([...primary, ...extras])
    setLoading(false)
  }, [user, ownerId, isOwn, activeAccount])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const createGroup = async (name) => {
    const { data, error } = await storageService.createGroup(ownerId, name)
    if (!error) await fetchGroups()
    return { data, error }
  }

  const deleteGroup = async (id) => {
    const { error } = await storageService.deleteGroup(id)
    if (!error) await fetchGroups()
    return { error }
  }

  return { groups, loading, refetch: fetchGroups, createGroup, deleteGroup }
}
