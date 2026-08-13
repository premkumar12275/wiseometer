import { useState } from 'react'
import { INVESTMENT_TYPES } from '../../constants/investmentTypes'
import { formatCurrency } from '../../utils/format'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function InvestmentReview({ rows, onConfirmed }) {
  const [items, setItems] = useState(rows)

  const update = (i, patch) =>
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const toggle = (i) => update(i, { excluded: !items[i].excluded })

  const included = items.filter((r) => !r.excluded)
  const fmt = formatCurrency

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
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Name</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Type</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Date</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Qty</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Invested</th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Current Value</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
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
                <td className="px-3 py-2 text-gray-300 max-w-[220px] truncate">
                  {row.name}{row.symbol && <span className="text-gray-500"> · {row.symbol}</span>}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.type}
                    onChange={(e) => update(i, { type: e.target.value })}
                    disabled={row.excluded}
                    className="bg-transparent text-gray-300 border-none outline-none text-xs cursor-pointer py-0"
                  >
                    {INVESTMENT_TYPES.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#1a1d27]">
                        {t.emoji} {t.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-gray-400 font-mono whitespace-nowrap">{row.purchaseDate}</td>
                <td className="px-3 py-2 text-gray-400 font-mono whitespace-nowrap">{row.quantity ?? '—'}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap text-gray-300">{fmt(row.amountInvested)}</td>
                <td className="px-3 py-2 font-mono whitespace-nowrap text-green-400/80">{fmt(row.currentValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        disabled={included.length === 0}
        onClick={() => onConfirmed(included)}
        className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Import {included.length} investment{included.length !== 1 ? 's' : ''} →
      </button>
    </div>
  )
}
