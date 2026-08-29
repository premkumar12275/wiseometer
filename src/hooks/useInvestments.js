import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

// Loads the active account's investment portfolio — every investment (each
// already carrying its derived "paid so far"), the folders they sit in, and one
// set of totals PER CURRENCY. Nothing is converted between currencies, so there
// is deliberately no single portfolio figure. No pagination or filtering,
// unlike transactions.
export function useInvestments(ownerId) {
  const [investments, setInvestments] = useState([])
  const [folders, setFolders] = useState([])
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ownerId) {
      setInvestments([]); setFolders([]); setCurrencies([]); setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await storageService.getInvestmentsSummary(ownerId)
    setInvestments(data?.investments || [])
    setFolders(data?.folders || [])
    setCurrencies(data?.currencies || [])
    setLoading(false)
  }, [ownerId])

  useEffect(() => { load() }, [load])

  return { investments, folders, currencies, loading, refetch: load }
}
