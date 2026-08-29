import { supabase } from '../lib/supabaseClient'

export const storageService = {
  // ─── Transactions ───────────────────────────────────────────────────────────

  // Scope + filters shared by the paged list and its totals, so the summary
  // strip can never drift from the rows it is summarising.
  applyTransactionFilters: (query, { userId, month, year, viewMode, category, type, search, dateFrom, dateTo, groupId }) => {
    // A group view is scoped by group_id (RLS allows shared groups, whose rows
    // belong to the owner, not the viewer). Elsewhere, scope to the user's own
    // account. Account-level sharing (Phase 2) will replace this with the
    // active-account owner id.
    if (groupId) {
      query = query.eq('group_id', groupId)
    } else {
      query = query.eq('user_id', userId)
    }

    // An explicit From/To range overrides the period view so it can span
    // months. A group view is all-time, so the period filter is skipped there too.
    if (dateFrom || dateTo) {
      if (dateFrom) query = query.gte('date', dateFrom)
      if (dateTo) query = query.lte('date', dateTo)
    } else if (viewMode === 'year' && year && !groupId) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
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
    return query
  },

  getTransactions: async ({ page = 1, pageSize = 20, ...filters }) => {
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      query = storageService.applyTransactionFilters(query, filters)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      return { data, error, count }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // Totals across EVERY row the current filters match, not just the visible
  // page. Aggregated client-side like the dashboard summaries; the explicit
  // range lifts PostgREST's default row cap for a busy year.
  getTransactionTotals: async (filters) => {
    try {
      let query = supabase.from('transactions').select('amount, type, group_id')
      query = storageService.applyTransactionFilters(query, filters).range(0, 9999)

      const { data, error } = await query
      if (error || !data) return { data: null, error }

      const sumType = (t) =>
        data.filter((r) => r.type === t).reduce((s, r) => s + parseFloat(r.amount), 0)

      const income = sumType('income')
      const expenses = sumType('expense')
      const grouped = data.filter((r) => r.group_id)

      return {
        data: {
          count: data.length,
          income,
          expenses,
          transfers: sumType('transfer'),
          net: income - expenses,
          groupedCount: grouped.length,
          groupedExpenses: grouped
            .filter((r) => r.type === 'expense')
            .reduce((s, r) => s + parseFloat(r.amount), 0),
        },
        error: null,
      }
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

  getAllTransactionsForYear: async ({ userId, year }) => {
    try {
      const from = `${year}-01-01`
      const to = `${year}-12-31`

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

  // Same patch applied to every id. Tag add/remove can't go through this (each
  // row needs its own merged array) — see updateTransactionsIndividually.
  updateTransactions: async (ids, updates) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .in('id', ids)
        .select()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // A different patch per row, for bulk edits that depend on each row's current
  // value. Selection is capped at one page, so this stays a small handful of
  // requests. Stops at the first failure and reports how many landed.
  updateTransactionsIndividually: async (patches) => {
    try {
      let updated = 0
      for (const { id, updates } of patches) {
        const { error } = await supabase.from('transactions').update(updates).eq('id', id)
        if (error) return { data: { updated }, error }
        updated += 1
      }
      return { data: { updated }, error: null }
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

  getTransactionTags: async (ownerId) => {
    try {
      const { data, error } = await supabase.rpc('get_transaction_tags', { p_owner: ownerId })
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
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

  // The dashboard keeps grouped spending out of the headline totals and shows
  // each group as its own section, so every summary reports on the UNGROUPED
  // rows and hands back a per-group breakdown alongside. `transactions` stays
  // complete — the recent-activity feed is a feed, not a total.
  summarize: (data, bucketOf) => {
    const ungrouped = data.filter((t) => !t.group_id)
    const sumType = (rows, type) =>
      rows.filter((t) => t.type === type).reduce((sum, t) => sum + parseFloat(t.amount), 0)

    const income = sumType(ungrouped, 'income')
    const expenses = sumType(ungrouped, 'expense')

    const byCategory = ungrouped
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount)
        return acc
      }, {})

    const byBucket = ungrouped
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        const key = bucketOf(t)
        acc[key] = (acc[key] || 0) + parseFloat(t.amount)
        return acc
      }, {})

    // Per-group totals for the same period, keyed by group id.
    const groupIds = [...new Set(data.filter((t) => t.group_id).map((t) => t.group_id))]
    const groups = groupIds.map((id) => {
      const rows = data.filter((t) => t.group_id === id)
      return {
        groupId: id,
        count: rows.length,
        expense: sumType(rows, 'expense'),
        income: sumType(rows, 'income'),
        transfer: sumType(rows, 'transfer'),
      }
    }).sort((a, b) => b.expense - a.expense)

    return { income, expenses, net: income - expenses, byCategory, byBucket, groups, transactions: data }
  },

  getMonthlySummary: async (userId, month, year) => {
    try {
      const { data, error } = await storageService.getAllTransactionsForMonth({
        userId,
        month,
        year,
      })
      if (error || !data) return { data: null, error }

      const { byBucket, ...rest } = storageService.summarize(data, (t) => t.date.slice(8, 10))
      return { data: { ...rest, byDay: byBucket }, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  getYearlySummary: async (userId, year) => {
    try {
      const { data, error } = await storageService.getAllTransactionsForYear({ userId, year })
      if (error || !data) return { data: null, error }

      const { byBucket, ...rest } = storageService.summarize(data, (t) => t.date.slice(5, 7))
      return { data: { ...rest, byMonth: byBucket }, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // All-time totals for every group the account owns, in one query — the
  // dashboard shows each group's lifetime spend next to its period spend
  // (a trip group routinely spans several months).
  getAllGroupTotals: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('group_id, amount, type')
        .eq('user_id', userId)
        .not('group_id', 'is', null)
      if (error || !data) return { data: null, error }

      const totals = data.reduce((acc, t) => {
        const g = (acc[t.group_id] ||= { count: 0, expense: 0, income: 0, transfer: 0 })
        g.count += 1
        g[t.type] += parseFloat(t.amount)
        return acc
      }, {})

      return { data: totals, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  // ─── Investments ────────────────────────────────────────────────────────────

  getInvestmentsSummary: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false })
      if (error || !data) return { data: null, error }

      const invested = data.reduce((sum, i) => sum + parseFloat(i.amount_invested), 0)
      const currentValue = data.reduce((sum, i) => sum + parseFloat(i.current_value), 0)
      const gainLoss = currentValue - invested
      const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0

      return {
        data: { invested, currentValue, gainLoss, gainLossPct, investments: data },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  saveInvestment: async (investment) => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .insert([investment])
        .select()
        .single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  saveInvestments: async (investmentArray) => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .insert(investmentArray)
        .select()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  updateInvestment: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  },

  deleteInvestment: async (id) => {
    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },

  deleteInvestments: async (ids) => {
    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .in('id', ids)
      return { error }
    } catch (err) {
      return { error: err }
    }
  },
}
