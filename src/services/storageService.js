import { supabase } from '../lib/supabaseClient'

export const storageService = {
  // ─── Transactions ───────────────────────────────────────────────────────────

  getTransactions: async ({ userId, month, year, category, type, search, dateFrom, dateTo, groupId, page = 1, pageSize = 20 }) => {
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      // A group view is scoped by group_id (RLS allows shared groups, whose rows
      // belong to the owner, not the viewer). Elsewhere, scope to the user's own
      // account. Account-level sharing (Phase 2) will replace this with the
      // active-account owner id.
      if (groupId) {
        query = query.eq('group_id', groupId)
      } else {
        query = query.eq('user_id', userId)
      }

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

  // ─── Transaction history ───────────────────────────────────────────────────

  getTransactionHistory: async (ownerId) => {
    try {
      const { data, error } = await supabase
        .from('transaction_history')
        .select('*')
        .eq('owner_id', ownerId)
        .order('changed_at', { ascending: false })
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // ─── Groups ─────────────────────────────────────────────────────────────────

  // Returns groups the user owns AND groups shared with them (RLS scopes the set).
  getGroups: async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
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

  getGroupSummary: async (groupId) => {
    try {
      // Scoped by group_id (RLS handles owned vs shared).
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
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

  // ─── Group sharing ───────────────────────────────────────────────────────────

  // Members the owner has shared a group with.
  getGroupShares: async (groupId) => {
    try {
      const { data, error } = await supabase
        .from('group_shares')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // Shares where the current user is the invitee → role per shared group.
  getMyGroupShares: async () => {
    try {
      const { data, error } = await supabase
        .from('group_shares')
        .select('group_id, role, owner_username, owner_name')
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // Invite by username or email. `owner` is the current user's profile (for the
  // denormalized label the invitee sees).
  shareGroup: async ({ groupId, identifier, role, owner }) => {
    try {
      const id = (identifier || '').trim()
      const isEmail = id.includes('@')
      const { data: found } = await supabase.rpc('find_user', { identifier: id })
      const invitee = Array.isArray(found) ? found[0] : found

      if (!invitee && !isEmail) {
        return { error: { message: 'No user found with that username.' } }
      }
      if (invitee && invitee.id === owner.id) {
        return { error: { message: "You can't share with yourself." } }
      }
      if (!invitee && isEmail && id.toLowerCase() === (owner.email || '').toLowerCase()) {
        return { error: { message: "You can't share with yourself." } }
      }

      const row = {
        group_id: groupId,
        owner_username: owner.username,
        owner_name: owner.name,
        owner_email: owner.email,
        role,
        ...(invitee
          ? { invitee_id: invitee.id, invitee_username: invitee.username, invitee_name: invitee.name, invitee_email: invitee.email }
          : { invitee_email: id.toLowerCase() }),
      }

      const { data, error } = await supabase.from('group_shares').insert([row]).select().single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  updateGroupShareRole: async (id, role) => {
    try {
      const { error } = await supabase.from('group_shares').update({ role }).eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  deleteGroupShare: async (id) => {
    try {
      const { error } = await supabase.from('group_shares').delete().eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  // ─── Account sharing ─────────────────────────────────────────────────────────

  // Rows the owner created (people they've shared their account with) plus rows
  // where they're the invitee. Callers filter by owner_id to split the two.
  getAccountShares: async () => {
    try {
      const { data, error } = await supabase
        .from('account_shares')
        .select('*')
        .order('created_at', { ascending: true })
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  shareAccount: async ({ identifier, role, owner }) => {
    try {
      const id = (identifier || '').trim()
      const isEmail = id.includes('@')
      const { data: found } = await supabase.rpc('find_user', { identifier: id })
      const invitee = Array.isArray(found) ? found[0] : found

      if (!invitee && !isEmail) return { error: { message: 'No user found with that username.' } }
      if (invitee && invitee.id === owner.id) return { error: { message: "You can't share with yourself." } }
      if (!invitee && isEmail && id.toLowerCase() === (owner.email || '').toLowerCase()) {
        return { error: { message: "You can't share with yourself." } }
      }

      const row = {
        owner_id: owner.id,
        owner_username: owner.username,
        owner_name: owner.name,
        owner_email: owner.email,
        role,
        ...(invitee
          ? { invitee_id: invitee.id, invitee_username: invitee.username, invitee_name: invitee.name, invitee_email: invitee.email }
          : { invitee_email: id.toLowerCase() }),
      }
      const { data, error } = await supabase.from('account_shares').insert([row]).select().single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  updateAccountShareRole: async (id, role) => {
    try {
      const { error } = await supabase.from('account_shares').update({ role }).eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  deleteAccountShare: async (id) => {
    try {
      const { error } = await supabase.from('account_shares').delete().eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
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
