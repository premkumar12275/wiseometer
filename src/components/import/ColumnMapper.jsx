import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

// Date + description are required. At least one money column (out or in) must be
// mapped — bank statements typically split withdrawals and deposits into two.
const FIELDS = [
  { key: 'date',        label: 'Date',                 required: true },
  { key: 'description', label: 'Description',           required: true },
  { key: 'amountOut',   label: 'Money out (expense)',  required: false },
  { key: 'amountIn',    label: 'Money in (income)',    required: false },
]

function preview(rows, mapping) {
  return rows.slice(0, 5).map((row) => ({
    date: row[mapping.date] ?? '',
    description: row[mapping.description] ?? '',
    amountOut: mapping.amountOut ? row[mapping.amountOut] ?? '' : '',
    amountIn: mapping.amountIn ? row[mapping.amountIn] ?? '' : '',
  }))
}

function autoDetect(headers) {
  const lower = headers.map((h) => h.toLowerCase())
  const find = (candidates) =>
    headers.find((_, i) => candidates.some((c) => lower[i].includes(c))) || ''

  return {
    date: find(['date', 'datum', 'dato', 'time']),
    description: find(['desc', 'text', 'memo', 'narration', 'details', 'merchant']),
    amountOut: find(['withdrawal', 'uttak', 'debet', 'debit', 'out', 'beløp ut']),
    amountIn: find(['deposit', 'innskudd', 'kredit', 'credit', 'beløp inn']),
  }
}

export default function ColumnMapper({ headers, rows, onMapped }) {
  const [mapping, setMapping] = useState(() => autoDetect(headers))

  const set = (field, value) => setMapping((m) => ({ ...m, [field]: value }))
  const previewed = preview(rows, mapping)
  const hasAmount = Boolean(mapping.amountOut || mapping.amountIn)
  const allMapped = Boolean(mapping.date && mapping.description) && hasAmount

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              {field.label}
              {!field.required && <span className="text-gray-600 normal-case"> (optional)</span>}
            </label>
            <select
              value={mapping[field.key]}
              onChange={(e) => set(field.key, e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="">— select column —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Preview (first 5 rows)</p>
        <div className="overflow-x-auto rounded-lg border border-[#2a2d3a]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d3a]">
                {['Date', 'Description', 'Money out', 'Money in'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewed.map((row, i) => (
                <tr key={i} className="border-b border-[#2a2d3a]/50 last:border-0">
                  <td className="px-3 py-2 text-gray-400 font-mono">{String(row.date)}</td>
                  <td className="px-3 py-2 text-gray-300 truncate max-w-[300px]">{String(row.description)}</td>
                  <td className="px-3 py-2 text-red-400/80 font-mono">{String(row.amountOut)}</td>
                  <td className="px-3 py-2 text-green-400/80 font-mono">{String(row.amountIn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!allMapped && (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertCircle size={14} />
          <span>Map Date, Description, and at least one money column to continue.</span>
        </div>
      )}

      <button
        disabled={!allMapped}
        onClick={() => onMapped(mapping)}
        className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue →
      </button>
    </div>
  )
}
