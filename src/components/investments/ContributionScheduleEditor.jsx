import { formatCurrency } from '../../utils/format'
import { getFrequency } from '../../utils/investmentPlan'
import { Plus, X } from 'lucide-react'

/**
 * The list of "from this date the contribution is X" changes.
 *
 * Only changes live here — the starting amount is the investment's own
 * contribution_amount, shown as a read-only first row so the whole timeline
 * reads in one place.
 */
export default function ContributionScheduleEditor({
  startDate, baseAmount, frequency, changes, onChange,
}) {
  const per = getFrequency(frequency).per

  const update = (i, patch) =>
    onChange(changes.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const add = () => {
    // Default the new change to the day after the latest one, so rows stay in
    // order and the date picker opens somewhere sensible.
    const latest = changes.reduce((max, c) => (c.effective_from > max ? c.effective_from : max), startDate || '')
    onChange([...changes, { effective_from: latest, amount: '' }])
  }

  const remove = (i) => onChange(changes.filter((_, idx) => idx !== i))

  return (
    <div className="rounded-lg border border-[#2a2d3a] overflow-hidden">
      <div className="px-3 py-2 bg-[#1a1d27] border-b border-[#2a2d3a] flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Contribution changes
        </span>
        <button
          type="button"
          onClick={add}
          className="text-teal-400 hover:text-teal-300 transition-colors cursor-pointer flex items-center gap-1 text-xs"
        >
          <Plus size={12} /> Add change
        </button>
      </div>

      <div className="p-2 space-y-1.5">
        {/* The starting amount, for context — edited in the field above. */}
        <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-gray-500">
          <span className="w-[130px] flex-shrink-0">From {startDate || '—'}</span>
          <span className="flex-1 amount-font">
            {baseAmount ? `${formatCurrency(baseAmount)}${per}` : '—'}
          </span>
          <span className="text-[10px] text-gray-600 pr-6">starting amount</span>
        </div>

        {changes.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="date"
              value={c.effective_from}
              min={startDate || undefined}
              onChange={(e) => update(i, { effective_from: e.target.value })}
              className="w-[130px] flex-shrink-0 bg-[#1f2233] border border-[#2a2d3a] rounded px-1.5 py-1 text-xs text-gray-200 outline-none focus:border-teal-400 amount-font"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="New amount"
              value={c.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
              className="flex-1 bg-[#1f2233] border border-[#2a2d3a] rounded px-1.5 py-1 text-xs text-gray-200 outline-none focus:border-teal-400 amount-font placeholder-gray-600"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors cursor-pointer flex-shrink-0"
              aria-label="Remove change"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {changes.length === 0 && (
          <p className="text-[11px] text-gray-600 px-1.5 py-1">
            No changes — every period uses the starting amount.
          </p>
        )}
      </div>
    </div>
  )
}
