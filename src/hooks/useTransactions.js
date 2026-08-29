import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

export function useTransactions({ userId, month, year, viewMode, category, type, search, dateFrom, dateTo, groupId, page }) {
  const [transactions, setTransactions] = useState([])
  const [count, setCount] = useState(0)
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTransactions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const filters = { userId, month, year, viewMode, category, type, search, dateFrom, dateTo, groupId }

    // The page of rows and the totals for the whole filtered set are independent
    // queries over the same filters — fetched together so they never disagree.
    const [list, summary] = await Promise.all([
      storageService.getTransactions({ ...filters, page }),
      storageService.getTransactionTotals(filters),
    ])

    if (list.error) setError(list.error.message)
    else {
      setError(null)
      setTransactions(list.data || [])
      setCount(list.count || 0)
    }
    setTotals(summary.data || null)
    setLoading(false)
  }, [userId, month, year, viewMode, category, type, search, dateFrom, dateTo, groupId, page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return { transactions, count, totals, loading, error, refetch: fetchTransactions }
}
