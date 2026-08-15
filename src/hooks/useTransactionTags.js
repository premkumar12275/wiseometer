import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

// Distinct tags already used across the active account's transactions —
// powers tag-entry autocomplete.
export function useTransactionTags(ownerId) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ownerId) { setTags([]); setLoading(false); return }
    setLoading(true)
    const { data } = await storageService.getTransactionTags(ownerId)
    setTags(data || [])
    setLoading(false)
  }, [ownerId])

  useEffect(() => { load() }, [load])

  return { tags, loading, refetch: load }
}
