import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

export function useGroups(userId) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGroups = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await storageService.getGroups(userId)
    setGroups(data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

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
