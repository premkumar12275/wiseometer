import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

// Loads the active account's investment portfolio — every investment (each
// already carrying its derived "paid so far"), the folders they sit in, and
// the top-line totals. No pagination or filtering, unlike transactions.
export function useInvestments(ownerId) {
  const [investments, setInvestments] = useState([])
  const [folders, setFolders] = useState([])
  const [invested, setInvested] = useState(0)
  const [currentValue, setCurrentValue] = useState(0)
  const [gainLoss, setGainLoss] = useState(0)
  const [gainLossPct, setGainLossPct] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!ownerId) { setInvestments([]); setFolders([]); setLoading(false); return }
    setLoading(true)
    const { data } = await storageService.getInvestmentsSummary(ownerId)
    setInvestments(data?.investments || [])
    setFolders(data?.folders || [])
    setInvested(data?.invested || 0)
    setCurrentValue(data?.currentValue || 0)
    setGainLoss(data?.gainLoss || 0)
    setGainLossPct(data?.gainLossPct || 0)
    setLoading(false)
  }, [ownerId])

  useEffect(() => { load() }, [load])

  return { investments, folders, invested, currentValue, gainLoss, gainLossPct, loading, refetch: load }
}
