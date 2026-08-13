import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

// Name, Purchase Date, and Amount Invested are required. Current Value is
// optional — if the statement doesn't have it, it defaults to the amount
// invested (no gain/loss known yet).
const FIELDS = [
  { key: 'name',           label: 'Name',             required: true },
  { key: 'symbol',         label: 'Symbol',           required: false },
  { key: 'purchaseDate',   label: 'Purchase Date',    required: true },
  { key: 'quantity',       label: 'Quantity',         required: false },
  { key: 'amountInvested', label: 'Amount Invested',  required: true },
  { key: 'currentValue',   label: 'Current Value',    required: false },
  { key: 'notes',          label: 'Notes',            required: false },
]

function preview(rows, mapping) {
  return rows.slice(0, 5).map((row) => ({
    name: row[mapping.name] ?? '',
    purchaseDate: row[mapping.purchaseDate] ?? '',
    amountInvested: row[mapping.amountInvested] ?? '',
    currentValue: mapping.currentValue ? row[mapping.currentValue] ?? '' : '',
  }))
}

function autoDetect(headers) {
  const lower = headers.map((h) => h.toLowerCase())
  const find = (candidates) =>
    headers.find((_, i) => candidates.some((c) => lower[i].includes(c))) || ''

  return {
    name: find(['name', 'holding', 'security', 'instrument', 'fond', 'aksje']),
    symbol: find(['symbol', 'ticker', 'isin']),
    purchaseDate: find(['date', 'dato', 'trade date', 'kjøpsdato']),
    quantity: find(['quantity', 'qty', 'units', 'shares', 'antall']),
    amountInvested: find(['cost', 'invested', 'purchase price', 'kostpris', 'innskutt']),
    currentValue: find(['current value', 'market value', 'markedsverdi', 'verdi']),
    notes: find(['comment', 'comments', 'merknad', 'note', 'anmerkning', 'remark']),
  }
}

export default function InvestmentColumnMapper({ headers, rows, onMapped }) {
  const [mapping, setMapping] = useState(() => autoDetect(headers))

  const set = (field, value) => setMapping((m) => ({ ...m, [field]: value }))
  const previewed = preview(rows, mapping)
  const allMapped = Boolean(mapping.name && mapping.purchaseDate && mapping.amountInvested)

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
                {['Name', 'Purchase Date', 'Amount Invested', 'Current Value'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewed.map((row, i) => (
                <tr key={i} className="border-b border-[#2a2d3a]/50 last:border-0">
                  <td className="px-3 py-2 text-gray-300 truncate max-w-[300px]">{String(row.name)}</td>
                  <td className="px-3 py-2 text-gray-400 font-mono">{String(row.purchaseDate)}</td>
                  <td className="px-3 py-2 text-gray-300 font-mono">{String(row.amountInvested)}</td>
                  <td className="px-3 py-2 text-green-400/80 font-mono">{String(row.currentValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!allMapped && (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertCircle size={14} />
          <span>Map Name, Purchase Date, and Amount Invested to continue.</span>
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
