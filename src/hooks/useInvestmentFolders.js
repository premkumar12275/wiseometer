import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

// Just the folder list, for the sidebar. The Investments page loads the full
// portfolio separately; this stays cheap because it runs on every page.
export function useInvestmentFolders(ownerId) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ownerId) { setFolders([]); setLoading(false); return }
    const { data } = await storageService.getInvestmentFolders(ownerId)
    setFolders(data || [])
    setLoading(false)
  }, [ownerId])

  useEffect(() => { load() }, [load])

  return { folders, loading, refetch: load }
}
