import { PiggyBank } from 'lucide-react'
import { formatIn } from '../../utils/format'

// One line per currency held. Nothing is converted, so the card shows several
// figures rather than a single fabricated total.
function CurrencyLine({ row, primary }) {
  const gainColor = row.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
  return (
    <div className="flex items-baseline gap-2">
      <p className={`amount-font font-semibold text-white truncate ${primary ? 'text-xl' : 'text-sm'}`}>
        {formatIn(row.currentValue, row.currency)}
      </p>
      <p className={`amount-font text-xs font-medium ${gainColor}`}>
        {row.gainLoss >= 0 ? '+' : ''}{formatIn(row.gainLoss, row.currency)}
        {' '}({row.gainLossPct >= 0 ? '+' : ''}{row.gainLossPct.toFixed(1)}%)
      </p>
    </div>
  )
}

export default function InvestmentsSummaryCard({ summary, loading, onNavigate }) {
  const currencies = summary?.currencies || []

  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-400/10 text-teal-400">
        <PiggyBank size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Investments</p>
        {loading ? (
          <div className="skeleton h-6 w-28 rounded" />
        ) : currencies.length === 0 ? (
          <p className="text-sm text-gray-600">Nothing tracked yet</p>
        ) : (
          <div className="space-y-0.5">
            {currencies.map((row, i) => (
              <CurrencyLine key={row.currency} row={row} primary={i === 0} />
            ))}
          </div>
        )}
      </div>
      {onNavigate && (
        <button
          onClick={() => onNavigate('investments')}
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer flex-shrink-0 self-start"
        >
          View all →
        </button>
      )}
    </div>
  )
}
