import { useState, useEffect, useCallback } from 'react'
import { storageService } from '../services/storageService'

export function useTransactions({ userId, month, year, category, type, search, dateFrom, dateTo, page }) {
  const [transactions, setTransactions] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTransactions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error: err, count: total } = await storageService.getTransactions({
      userId,
      month,
      year,
      category,
      type,
      search,
      dateFrom,
      dateTo,
      page,
    })
    if (err) setError(err.message)
    else {
      setTransactions(data || [])
      setCount(total || 0)
    }
    setLoading(false)
  }, [userId, month, year, category, type, search, dateFrom, dateTo, page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return { transactions, count, loading, error, refetch: fetchTransactions }
}
