import { supabase } from '../lib/supabaseClient'

export const storageService = {
  // ─── Transactions ───────────────────────────────────────────────────────────

  getTransactions: async ({ userId, month, year, category, type, search, dateFrom, dateTo, groupId, page = 1, pageSize = 20 }) => {
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      // An explicit From/To range overrides the month/year view so it can span
      // months. A group view is all-time, so the month filter is skipped there too.
      if (dateFrom || dateTo) {
        if (dateFrom) query = query.gte('date', dateFrom)
        if (dateTo) query = query.lte('date', dateTo)
      } else if (month && year && !groupId) {
        const from = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
        query = query.gte('date', from).lte('date', to)
      }
      if (groupId) {
        query = query.eq('group_id', groupId)
      }
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }
      if (type && type !== 'all') {
        query = query.eq('type', type)
      }
      if (search) {
        query = query.ilike('description', `%${search}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      return { data, error, count }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  getAllTransactionsForMonth: async ({ userId, month, year }) => {
    try {
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true })

      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  saveTransaction: async (tx) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([tx])
        .select()
        .single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  saveTransactions: async (txArray) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert(txArray)
        .select()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  updateTransaction: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  deleteTransaction: async (id) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  deleteTransactions: async (ids) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  // ─── Groups ─────────────────────────────────────────────────────────────────

  getGroups: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  createGroup: async (userId, name) => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{ user_id: userId, name }])
        .select()
        .single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  deleteGroup: async (id) => {
    try {
      // Transactions keep their history; group_id is set to null via the FK.
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  getGroupSummary: async (userId, groupId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', userId)
        .eq('group_id', groupId)
      if (error || !data) return { data: null, error }

      const sumByType = (t) =>
        data.filter((r) => r.type === t).reduce((s, r) => s + parseFloat(r.amount), 0)

      return {
        data: {
          count: data.length,
          expense: sumByType('expense'),
          income: sumByType('income'),
          transfer: sumByType('transfer'),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // ─── Categories (custom) ─────────────────────────────────────────────────────

  getCategories: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  createCategory: async (userId, { label, emoji, color }) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ user_id: userId, label, emoji, color }])
        .select()
        .single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  deleteCategory: async (id) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  // ─── Imports ────────────────────────────────────────────────────────────────

  uploadStatement: async (file, userId) => {
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('statements')
        .upload(path, file, { upsert: false })
      return { data, error, path }
    } catch (err) {
      return { data: null, error: err, path: null }
    }
  },

  logImport: async (userId, filename, filePath, rowCount) => {
    try {
      const { data, error } = await supabase
        .from('statement_imports')
        .insert([{ user_id: userId, filename, file_path: filePath, row_count: rowCount }])
        .select()
        .single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // ─── Summary ─────────────────────────────────────────────────────────────────

  getMonthlySummary: async (userId, month, year) => {
    try {
      const { data, error } = await storageService.getAllTransactionsForMonth({
        userId,
        month,
        year,
      })
      if (error || !data) return { data: null, error }

      const income = data
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)

      const expenses = data
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)

      const byCategory = data
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount)
          return acc
        }, {})

      const byDay = data
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => {
          const day = t.date.slice(8, 10)
          acc[day] = (acc[day] || 0) + parseFloat(t.amount)
          return acc
        }, {})

      return {
        data: { income, expenses, net: income - expenses, byCategory, byDay, transactions: data },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err }
    }
  },
}
