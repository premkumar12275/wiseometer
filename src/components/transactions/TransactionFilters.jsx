import { useState } from 'react'
import { CATEGORIES } from '../../constants/categories'
import { Search, SlidersHorizontal, X } from 'lucide-react'

export default function TransactionFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false)

  const set = (key, value) => onChange({ ...filters, [key]: value })
  const clear = () =>
    onChange({ category: 'all', type: 'all', search: '', dateFrom: '', dateTo: '' })

  const activeCount = [
    filters.category !== 'all',
    filters.type !== 'all',
    !!filters.dateFrom,
    !!filters.dateTo,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            className="input-field pl-9 text-sm h-9"
            placeholder="Search transactions…"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
          />
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={`btn-secondary flex items-center gap-2 text-sm h-9 px-3 relative ${open ? 'border-teal-400/40' : ''}`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-400 text-navy-900 text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        {activeCount > 0 && (
          <button onClick={clear} className="btn-secondary text-sm h-9 px-3 flex items-center gap-1 text-red-400 hover:text-red-300">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {open && (
        <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 fade-in">
          {/* Category */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => set('category', e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => set('type', e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="all">All types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set('dateFrom', e.target.value)}
              className="input-field text-sm py-1.5"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => set('dateTo', e.target.value)}
              className="input-field text-sm py-1.5"
            />
          </div>
        </div>
      )}
    </div>
  )
}
