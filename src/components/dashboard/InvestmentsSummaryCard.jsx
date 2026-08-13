import { PiggyBank } from 'lucide-react'
import { formatCurrency } from '../../utils/format'

export default function InvestmentsSummaryCard({ summary, loading, onNavigate }) {
  const fmt = formatCurrency
  const gainLoss = summary?.gainLoss ?? 0
  const gainLossPct = summary?.gainLossPct ?? 0
  const gainColor = gainLoss >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-400/10 text-teal-400">
        <PiggyBank size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Investments</p>
        {loading ? (
          <div className="skeleton h-6 w-28 rounded" />
        ) : (
          <div className="flex items-baseline gap-2">
            <p className="amount-font text-xl font-semibold text-white truncate">{fmt(summary?.currentValue)}</p>
            <p className={`amount-font text-xs font-medium ${gainColor}`}>
              {gainLoss >= 0 ? '+' : ''}{fmt(gainLoss)} ({gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(1)}%)
            </p>
          </div>
        )}
      </div>
      {onNavigate && (
        <button
          onClick={() => onNavigate('investments')}
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer flex-shrink-0"
        >
          View all →
        </button>
      )}
    </div>
  )
}
