import { useState, useEffect } from 'react'
import { useTransactions } from '../../hooks/useTransactions'
import { storageService } from '../../services/storageService'
import { getCategoryById } from '../../constants/categories'
import { formatCurrency } from '../../utils/format'
import TransactionFilters from './TransactionFilters'
import TransactionForm from './TransactionForm'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Trash2, Pencil, Plus, Receipt, ChevronLeft, ChevronRight, Download } from 'lucide-react'

const PAGE_SIZE = 20

function exportCSV(transactions) {
  const header = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Account']
  const rows = transactions.map((t) => [
    t.date,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount,
    t.type,
    t.category,
    t.account || 'Main',
  ])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function ConfirmDelete({ count = 1, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-6 fade-in">
        <h3 className="text-base font-semibold text-white mb-2">
          Delete {count > 1 ? `${count} transactions` : 'transaction'}?
        </h3>
        <p className="text-sm text-gray-400 mb-5">This action cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 text-sm">Delete</button>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ tx, onEdit, onDelete, selected, onToggleSelect }) {
  const cat = getCategoryById(tx.category)
  const isIncome = tx.type === 'income'
  const isTransfer = tx.type === 'transfer'
  const amountColor = isTransfer ? 'text-slate-400' : isIncome ? 'text-green-400' : 'text-red-400'
  const AmountIcon = isTransfer ? ArrowLeftRight : isIncome ? ArrowUpRight : ArrowDownRight
  const fmt = formatCurrency

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors group rounded-lg ${selected ? 'bg-teal-400/10' : 'hover:bg-[#1f2233]'}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(tx.id)}
        className="w-4 h-4 flex-shrink-0 accent-teal-400 cursor-pointer"
        aria-label="Select transaction"
      />

      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
        style={{ backgroundColor: cat.color + '22' }}
      >
        {cat.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium truncate">
          {tx.description || <span className="text-gray-600 italic">No description</span>}
        </p>
        <p className="text-xs text-gray-500">{tx.date} · {cat.label}</p>
      </div>

      <div className={`amount-font text-sm font-semibold flex items-center gap-1 ${amountColor}`}>
        <AmountIcon size={13} />
        {fmt(tx.amount)}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(tx)} className="p-1.5 rounded-md text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors cursor-pointer">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(tx)} className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

export default function TransactionList({ user, month, year }) {
  const [filters, setFilters] = useState({
    category: 'all',
    type: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  })
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [pendingDelete, setPendingDelete] = useState(null) // array of ids awaiting confirmation

  const { transactions, count, loading, refetch } = useTransactions({
    userId: user.id,
    month,
    year,
    category: filters.category,
    type: filters.type,
    search: filters.search,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    page,
  })

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  // Keep the page in range when deletions shrink the result set.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  // Selection is scoped to the current page — cleared whenever the rows change.
  const clearSelection = () => setSelectedIds(new Set())
  const goToPage = (p) => { clearSelection(); setPage(p) }
  const onFiltersChange = (f) => { clearSelection(); setFilters(f); setPage(1) }

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allOnPageSelected =
    transactions.length > 0 && transactions.every((t) => selectedIds.has(t.id))

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) transactions.forEach((t) => next.delete(t.id))
      else transactions.forEach((t) => next.add(t.id))
      return next
    })

  const confirmDelete = async () => {
    if (!pendingDelete) return
    if (pendingDelete.length === 1) await storageService.deleteTransaction(pendingDelete[0])
    else await storageService.deleteTransactions(pendingDelete)
    clearSelection()
    setPendingDelete(null)
    refetch()
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditTx(null)
    refetch()
  }

  const handleEdit = (tx) => {
    setEditTx(tx)
    setShowForm(true)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? '—' : `${count} transaction${count !== 1 ? 's' : ''}`}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(transactions)}
            disabled={transactions.length === 0}
            className="btn-secondary flex items-center gap-2 text-sm py-1.5 disabled:opacity-40"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => { setEditTx(null); setShowForm(true) }}
            className="btn-primary flex items-center gap-2 text-sm py-1.5"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <TransactionFilters filters={filters} onChange={onFiltersChange} />

      <div className="card overflow-hidden">
        {!loading && transactions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a2d3a]">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-teal-400 cursor-pointer"
              />
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </label>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setPendingDelete([...selectedIds])}
                className="btn-danger flex items-center gap-1.5 text-xs py-1 px-2.5"
              >
                <Trash2 size={13} /> Delete {selectedIds.size}
              </button>
            )}
          </div>
        )}
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1">
                <div className="skeleton w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-2.5 w-1/4 rounded" />
                </div>
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <Receipt size={40} strokeWidth={1} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No transactions found</p>
            <p className="text-xs text-gray-700 mt-1">Try changing your filters or add one</p>
          </div>
        ) : (
          <div className="p-2">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onEdit={handleEdit}
                onDelete={(t) => setPendingDelete([t.id])}
                selected={selectedIds.has(tx.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <TransactionForm
          user={user}
          transaction={editTx}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditTx(null) }}
        />
      )}

      {pendingDelete && (
        <ConfirmDelete
          count={pendingDelete.length}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
