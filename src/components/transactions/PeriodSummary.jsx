import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, Tag } from 'lucide-react'
import { formatCurrency } from '../../utils/format'

function Stat({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="skeleton h-4 w-20 rounded mt-0.5" />
        ) : (
          <p className="amount-font text-sm font-semibold text-white truncate">{value}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Condensed version of the dashboard's summary cards, for the transactions
 * screen. Unlike the dashboard it totals exactly what the list is showing —
 * the active filters included, and grouped rows counted in — so the figures
 * always describe the rows underneath them.
 */
export default function PeriodSummary({ totals, periodLabel, loading, filtered }) {
  const hasTransfers = (totals?.transfers ?? 0) > 0
  const hasGrouped = (totals?.groupedCount ?? 0) > 0

  return (
    <div className="card px-5 py-3.5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          {periodLabel}
          {filtered && <span className="text-gray-600 normal-case tracking-normal"> · filtered</span>}
        </h3>
        {!loading && (
          <p className="text-[11px] text-gray-600">
            {totals?.count ?? 0} transaction{totals?.count !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className={`grid grid-cols-2 gap-4 ${hasTransfers ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <Stat
          label="Income"
          value={formatCurrency(totals?.income)}
          icon={TrendingUp}
          color="bg-green-500/10 text-green-400"
          loading={loading}
        />
        <Stat
          label="Expenses"
          value={formatCurrency(totals?.expenses)}
          icon={TrendingDown}
          color="bg-red-500/10 text-red-400"
          loading={loading}
        />
        <Stat
          label="Net"
          value={formatCurrency(totals?.net)}
          icon={Wallet}
          color={(totals?.net ?? 0) >= 0 ? 'bg-teal-400/10 text-teal-400' : 'bg-orange-500/10 text-orange-400'}
          loading={loading}
        />
        {hasTransfers && (
          <Stat
            label="Transfers"
            value={formatCurrency(totals?.transfers)}
            icon={ArrowLeftRight}
            color="bg-slate-500/10 text-slate-400"
            loading={loading}
          />
        )}
      </div>

      {/* The dashboard keeps grouped spend out of its headline figures, so say
          plainly that this screen does not — otherwise the two look wrong. */}
      {!loading && hasGrouped && (
        <p className="text-[11px] text-gray-600 mt-3 pt-3 border-t border-[#2a2d3a] flex items-center gap-1.5">
          <Tag size={11} className="text-teal-400/60" />
          Includes {formatCurrency(totals.groupedExpenses)} of group spending across{' '}
          {totals.groupedCount} transaction{totals.groupedCount !== 1 ? 's' : ''}, which the dashboard totals separately.
        </p>
      )}
    </div>
  )
}
