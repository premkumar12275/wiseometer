import { useState } from 'react'
import { getInvestmentTypeById } from '../../constants/investmentTypes'
import { formatIn } from '../../utils/format'
import { getFrequency } from '../../utils/investmentPlan'
import { Pencil, Trash2, Repeat, ChevronDown, ChevronRight } from 'lucide-react'

/**
 * One investment. Shared by the Investments page and a folder's detail view.
 *
 * With `expandable`, a recurring plan can open to show its payment schedule —
 * which stretch of months ran at which amount, and what each stretch cost.
 */
export default function InvestmentRow({ inv, onEdit, onDelete, canWrite, expandable = false }) {
  const [open, setOpen] = useState(false)
  const type = getInvestmentTypeById(inv.type)
  // `invested` is derived for a recurring plan — never read amount_invested here.
  const invested = inv.invested ?? parseFloat(inv.amount_invested)
  const gain = parseFloat(inv.current_value) - invested
  const gainPct = invested > 0 ? (gain / invested) * 100 : 0
  const gainColor = gain >= 0 ? 'text-green-400' : 'text-red-400'
  const freq = inv.is_recurring ? getFrequency(inv.frequency) : null
  const fmt = (n) => formatIn(n, inv.currency)
  const segments = inv.progress?.segments || []
  const canExpand = expandable && inv.is_recurring && segments.length > 0

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#1f2233] transition-colors rounded-lg group">
        {canExpand ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-gray-600 hover:text-gray-300 transition-colors cursor-pointer flex-shrink-0"
            aria-label={open ? 'Hide schedule' : 'Show schedule'}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : expandable ? (
          <span className="w-3.5 flex-shrink-0" />
        ) : null}

        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
          style={{ backgroundColor: type.color + '22' }}
        >
          {type.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 font-medium truncate flex items-center gap-1.5">
            {inv.name}
            {inv.symbol && <span className="text-gray-500">· {inv.symbol}</span>}
            {inv.is_recurring && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  inv.is_ongoing ? 'bg-teal-400/10 text-teal-400' : 'bg-[#1f2233] text-gray-500'
                }`}
              >
                <Repeat size={9} /> {inv.is_ongoing ? 'ongoing' : 'ended'}
              </span>
            )}
          </p>
          {inv.is_recurring ? (
            <p className="text-xs text-gray-500">
              <span className="amount-font">{fmt(inv.contribution_amount)}</span>{freq.per}
              {' · '}{inv.progress?.periods ?? 0} payment{inv.progress?.periods !== 1 ? 's' : ''} since {inv.purchase_date}
              {inv.changes?.length > 0 && ` · ${inv.changes.length} change${inv.changes.length !== 1 ? 's' : ''}`}
            </p>
          ) : (
            <p className="text-xs text-gray-500">
              {inv.purchase_date} · {type.label}
              {inv.quantity != null && ` · ${inv.quantity} units`}
            </p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <p className="amount-font text-sm font-semibold text-white">{fmt(inv.current_value)}</p>
          {inv.is_recurring ? (
            <p className="amount-font text-xs text-gray-500">{fmt(invested)} paid</p>
          ) : (
            <p className={`amount-font text-xs ${gainColor}`}>
              {gain >= 0 ? '+' : ''}{fmt(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
            </p>
          )}
        </div>

        {canWrite && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(inv)} className="p-1.5 rounded-md text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors cursor-pointer">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(inv)} className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Payment schedule — each stretch of periods that ran at one amount. */}
      {canExpand && open && (
        <div className="mx-4 mb-3 rounded-lg border border-[#2a2d3a] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2d3a] bg-[#1a1d27]">
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">From</th>
                <th className="text-left px-3 py-1.5 text-gray-500 font-medium">To</th>
                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Amount</th>
                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Payments</th>
                <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg) => (
                <tr key={seg.from} className="border-b border-[#2a2d3a]/50 last:border-0">
                  <td className="px-3 py-1.5 text-gray-400 amount-font">{seg.from}</td>
                  <td className="px-3 py-1.5 text-gray-400 amount-font">{seg.to}</td>
                  <td className="px-3 py-1.5 text-right text-gray-300 amount-font">{fmt(seg.amount)}</td>
                  <td className="px-3 py-1.5 text-right text-gray-400 amount-font">{seg.periods}</td>
                  <td className="px-3 py-1.5 text-right text-white amount-font font-semibold">{fmt(seg.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {inv.progress?.nextDueDate && (
            <p className="px-3 py-1.5 text-[11px] text-gray-600 bg-[#1a1d27] border-t border-[#2a2d3a]">
              Next payment due {inv.progress.nextDueDate}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
