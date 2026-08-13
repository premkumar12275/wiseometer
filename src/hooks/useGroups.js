import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

// Returns the user's groups (owned + shared with them). Each group is annotated
// with `access`: 'owner' | 'editor' | 'viewer'. Shared groups also carry the
// owner's label (ownerName/ownerUsername) and `shared: true`.
export function useGroups(userId) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGroups = useCallback(async () => {
    if (!userId) { setGroups([]); setLoading(false); return }
    setLoading(true)
    const [{ data: g }, { data: shares }] = await Promise.all([
      storageService.getGroups(),
      storageService.getMyGroupShares(),
    ])
    const shareByGroup = {}
    for (const s of shares || []) shareByGroup[s.group_id] = s

    const annotated = (g || []).map((grp) => {
      if (grp.user_id === userId) return { ...grp, access: 'owner' }
      const s = shareByGroup[grp.id]
      return {
        ...grp,
        access: s?.role || 'viewer',
        shared: true,
        ownerName: s?.owner_name,
        ownerUsername: s?.owner_username,
      }
    })
    setGroups(annotated)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const createGroup = async (name) => {
    const { data, error } = await storageService.createGroup(userId, name)
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
