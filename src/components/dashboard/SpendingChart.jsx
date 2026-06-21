import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CATEGORIES, getCategoryById } from '../../constants/categories'
import { formatCurrency } from '../../utils/format'
import { PieChart as PieIcon } from 'lucide-react'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const cat = getCategoryById(payload[0].name)
    return (
      <div className="card px-3 py-2 text-sm">
        <p className="font-medium text-white">
          {cat.emoji} {cat.label}
        </p>
        <p className="amount-font text-gray-300">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export default function SpendingChart({ summary, loading }) {
  const data = summary?.byCategory
    ? Object.entries(summary.byCategory).map(([id, value]) => {
        const cat = getCategoryById(id)
        return { name: id, label: cat.label, value, color: cat.color, emoji: cat.emoji }
      })
    : []

  const hasData = data.length > 0

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Spending by Category</h2>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton w-3 h-3 rounded-full" />
              <div className="skeleton h-3 flex-1 rounded" />
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-600">
          <PieIcon size={36} strokeWidth={1} className="mb-2 opacity-40" />
          <p className="text-sm">No expenses this month</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => {
                  const cat = getCategoryById(value)
                  return <span className="text-xs text-gray-400">{cat.emoji} {cat.label}</span>
                }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
