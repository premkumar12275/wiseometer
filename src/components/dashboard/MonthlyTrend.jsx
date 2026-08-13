import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { BarChart2 } from 'lucide-react'
import { formatCurrency } from '../../utils/format'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card px-3 py-2 text-sm">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="amount-font text-white font-medium">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export default function MonthlyTrend({ summary, year, loading }) {
  const data = MONTH_LABELS.map((label, i) => {
    const key = String(i + 1).padStart(2, '0')
    return {
      month: label,
      amount: summary?.byMonth?.[key] || 0,
    }
  })

  const hasData = data.some((d) => d.amount > 0)

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Spending</h2>

      {loading ? (
        <div className="skeleton h-36 w-full rounded-lg" />
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-600">
          <BarChart2 size={36} strokeWidth={1} className="mb-2 opacity-40" />
          <p className="text-sm">No data for {year}</p>
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `kr ${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1f2233' }} />
              <Bar dataKey="amount" fill="#2dd4bf" radius={[3, 3, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
