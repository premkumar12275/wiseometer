import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

// Loads the change history (insert/update/delete) for the active account's
// transactions, newest first.
export function useTransactionHistory(ownerId) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ownerId) { setHistory([]); setLoading(false); return }
    setLoading(true)
    const { data } = await storageService.getTransactionHistory(ownerId)
    setHistory(data || [])
    setLoading(false)
  }, [ownerId])

  useEffect(() => { load() }, [load])

  return { history, loading, refetch: load }
}
