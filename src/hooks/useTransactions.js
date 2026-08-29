import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

export function useTransactions({ userId, month, year, viewMode, category, type, search, dateFrom, dateTo, groupId, page }) {
  const [transactions, setTransactions] = useState([])
  const [count, setCount] = useState(0)
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // `silent` refreshes the data in place without flipping `loading`, so saving
  // one row doesn't collapse the whole list into a skeleton. Only a genuinely
  // new query (period, filters, page) shows the loading state.
  const fetchTransactions = useCallback(async ({ silent = false } = {}) => {
    if (!userId) return
    if (!silent) setLoading(true)
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
    if (!silent) setLoading(false)
  }, [userId, month, year, viewMode, category, type, search, dateFrom, dateTo, groupId, page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // What callers reach for after a mutation — the rows are already on screen,
  // so they should update in place rather than disappear and come back.
  const refetch = useCallback(() => fetchTransactions({ silent: true }), [fetchTransactions])

  return { transactions, count, totals, loading, error, refetch }
}
