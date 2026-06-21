import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency } from '../../utils/format'

function Card({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        {loading ? (
          <div className="skeleton h-6 w-28 rounded" />
        ) : (
          <p className="amount-font text-xl font-semibold text-white truncate">{value}</p>
        )}
      </div>
    </div>
  )
}

export default function SummaryCards({ summary, loading }) {
  const fmt = formatCurrency

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card
        label="Income"
        value={fmt(summary?.income)}
        icon={TrendingUp}
        color="bg-green-500/10 text-green-400"
        loading={loading}
      />
      <Card
        label="Expenses"
        value={fmt(summary?.expenses)}
        icon={TrendingDown}
        color="bg-red-500/10 text-red-400"
        loading={loading}
      />
      <Card
        label="Net Balance"
        value={fmt(summary?.net)}
        icon={Wallet}
        color={
          (summary?.net ?? 0) >= 0
            ? 'bg-teal-400/10 text-teal-400'
            : 'bg-orange-500/10 text-orange-400'
        }
        loading={loading}
      />
    </div>
  )
}
