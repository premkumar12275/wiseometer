import { useState } from 'react'
import { CATEGORIES, getCategoryById } from '../../constants/categories'
import { formatCurrency } from '../../utils/format'
import { CheckCircle2, XCircle } from 'lucide-react'

function confidenceBadge(score) {
  if (score >= 0.7) return 'text-green-400 bg-green-500/10'
  if (score >= 0.4) return 'text-amber-400 bg-amber-500/10'
  return 'text-gray-500 bg-[#1f2233]'
}

const TYPES = [
  { id: 'expense',  label: 'Expense',  color: 'text-red-400' },
  { id: 'income',   label: 'Income',   color: 'text-green-400' },
  { id: 'transfer', label: 'Transfer', color: 'text-slate-400' },
]

const typeColor = (type) => TYPES.find((t) => t.id === type)?.color || 'text-gray-300'

export default function CategoryReview({ rows, onConfirmed }) {
  const [items, setItems] = useState(rows)

  const update = (i, patch) =>
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const toggle = (i) => update(i, { excluded: !items[i].excluded })

  const included = items.filter((r) => !r.excluded)
  const fmt = formatCurrency

  // Totals by type, so the user sees the net effect before importing.
  const totalFor = (type) =>
    included.filter((r) => (r.type || 'expense') === type).reduce((s, r) => s + r.amount, 0)
  const totals = {
    expense: totalFor('expense'),
    income: totalFor('income'),
    transfer: totalFor('transfer'),
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {included.length} of {items.length} rows selected
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setItems((prev) => prev.map((r) => ({ ...r, excluded: false })))}
            className="text-xs text-teal-400 hover:text-teal-300 cursor-pointer transition-colors"
          >
            Select all
          </button>
          <span className="text-gray-700">·</span>
          <button
            onClick={() => setItems((prev) => prev.map((r) => ({ ...r, excluded: true })))}
            className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-colors"
          >
            Deselect all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#2a2d3a] max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#14171f] z-10">
            <tr className="border-b border-[#2a2d3a]">
              <th className="px-3 py-2 w-8"></th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Date</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Description</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Amount</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Type</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Category</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => {
              const type = row.type || 'expense'
              return (
                <tr
                  key={i}
                  className={`border-b border-[#2a2d3a]/50 last:border-0 transition-colors ${row.excluded ? 'opacity-30' : 'hover:bg-[#1f2233]'}`}
                >
                  <td className="px-3 py-2">
                    <button onClick={() => toggle(i)} className="cursor-pointer">
                      {row.excluded
                        ? <XCircle size={14} className="text-gray-600" />
                        : <CheckCircle2 size={14} className="text-teal-400" />}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-gray-400 font-mono whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-2 text-gray-300 max-w-[340px] truncate">{row.description}</td>
                  <td className={`px-3 py-2 font-mono whitespace-nowrap ${typeColor(type)}`}>{fmt(row.amount)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={type}
                      onChange={(e) => update(i, { type: e.target.value })}
                      disabled={row.excluded}
                      className={`bg-transparent border-none outline-none text-xs cursor-pointer py-0 ${typeColor(type)}`}
                    >
                      {TYPES.map((t) => (
                        <option key={t.id} value={t.id} className="bg-[#1a1d27] text-gray-200">
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.category}
                      onChange={(e) => update(i, { category: e.target.value })}
                      disabled={row.excluded}
                      className="bg-transparent text-gray-300 border-none outline-none text-xs cursor-pointer py-0"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#1a1d27]">
                          {c.emoji} {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${confidenceBadge(row.confidence)}`}>
                      {Math.round((row.confidence || 0) * 100)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Totals by type — transfers are excluded from income/expense */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <span className="text-gray-500">
          Expenses <span className="text-red-400 font-medium amount-font">{fmt(totals.expense)}</span>
        </span>
        <span className="text-gray-500">
          Income <span className="text-green-400 font-medium amount-font">{fmt(totals.income)}</span>
        </span>
        <span className="text-gray-500">
          Transfers <span className="text-slate-400 font-medium amount-font">{fmt(totals.transfer)}</span>
        </span>
      </div>

      <button
        disabled={included.length === 0}
        onClick={() => onConfirmed(included)}
        className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Import {included.length} transaction{included.length !== 1 ? 's' : ''} →
      </button>
    </div>
  )
}
