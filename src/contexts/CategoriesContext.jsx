import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { CATEGORIES as BUILT_IN } from '../constants/categories'
import { storageService } from '../services/storageService'

const CategoriesContext = createContext(null)

const OTHER = BUILT_IN[BUILT_IN.length - 1]

/**
 * Provides the full category list — built-in defaults plus the user's custom
 * categories — and a getCategoryById that resolves both. A transaction's
 * `category` field holds either a built-in slug ('food') or a custom uuid.
 */
export function CategoriesProvider({ userId, children }) {
  const [custom, setCustom] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await storageService.getCategories(userId)
    setCustom(
      (data || []).map((c) => ({
        id: c.id,
        label: c.label,
        emoji: c.emoji || '🏷️',
        color: c.color || '#6b7280',
        custom: true,
      })),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const categories = useMemo(() => [...BUILT_IN, ...custom], [custom])

  const getCategoryById = useCallback(
    (id) => categories.find((c) => c.id === id) || OTHER,
    [categories],
  )

  const createCategory = async (payload) => {
    const res = await storageService.createCategory(userId, payload)
    if (!res.error) await fetchCategories()
    return res
  }

  const deleteCategory = async (id) => {
    const res = await storageService.deleteCategory(id)
    if (!res.error) await fetchCategories()
    return res
  }

  const value = useMemo(
    () => ({ categories, custom, getCategoryById, loading, createCategory, deleteCategory, refetch: fetchCategories }),
    [categories, custom, getCategoryById, loading, fetchCategories],
  )

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used within a CategoriesProvider')
  return ctx
}
