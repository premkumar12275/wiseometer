import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatCompact } from '../../utils/format'
import { BarChart3, Table2 } from 'lucide-react'

const SURFACE = '#14171f' // card background — doubles as the gap between segments

function ChartTooltip({ active, payload, label, seriesColor }) {
  if (!active || !payload?.length) return null
  // Recharts hands over every series; drop the empty ones and show biggest first.
  const rows = payload.filter((p) => p.value > 0).sort((a, b) => b.value - a.value)
  const total = rows.reduce((s, p) => s + p.value, 0)

  return (
    <div className="card px-3 py-2 text-xs max-w-[220px]">
      <p className="font-medium text-white mb-1.5">{label}</p>
      {rows.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: seriesColor[p.dataKey] }} />
          <span className="text-gray-400 flex-1 truncate">{p.dataKey}</span>
          <span className="amount-font text-gray-200">{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 mt-1.5 pt-1.5 border-t border-[#2a2d3a]">
        <span className="text-gray-500">Total</span>
        <span className="amount-font text-white font-semibold">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

function DataTable({ data, series, seriesColor }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#2a2d3a]">
            <th className="text-left px-3 py-2 text-gray-500 font-medium">Category</th>
            {series.map((s) => (
              <th key={s} className="text-right px-3 py-2 text-gray-500 font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: seriesColor[s] }} />
                  {s}
                </span>
              </th>
            ))}
            <th className="text-right px-3 py-2 text-gray-500 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.categoryId} className="border-b border-[#2a2d3a]/50 last:border-0 hover:bg-[#1f2233]">
              <td className="px-3 py-2 text-gray-200 whitespace-nowrap">{row.emoji} {row.label}</td>
              {series.map((s) => (
                <td key={s} className="px-3 py-2 text-right amount-font text-gray-400">
                  {row[s] ? formatCurrency(row[s]) : <span className="text-gray-700">—</span>}
                </td>
              ))}
              <td className="px-3 py-2 text-right amount-font text-white font-semibold whitespace-nowrap">
                {formatCurrency(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CategoryTagChart({ data, series, seriesColor, foldedCount, loading }) {
  const [view, setView] = useState('chart')

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-3 w-40 rounded mb-5" />
        <div className="skeleton h-64 w-full rounded" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="card p-5 flex flex-col items-center justify-center py-16 text-gray-600">
        <BarChart3 size={40} strokeWidth={1} className="mb-3 opacity-40" />
        <p className="text-sm font-medium">No expenses to report</p>
        <p className="text-xs text-gray-700 mt-1">Pick another month or group</p>
      </div>
    )
  }

  // Chart height grows with the category count so labels never collide.
  const height = Math.max(280, data.length * 46 + 80)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">Expenses by category</h3>
          <p className="text-[11px] text-gray-600 mt-0.5">Each bar is split by tag</p>
        </div>
        <div className="flex items-center bg-[#1f2233] rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setView('chart')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              view === 'chart' ? 'bg-teal-400/10 text-teal-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <BarChart3 size={13} /> Chart
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              view === 'table' ? 'bg-teal-400/10 text-teal-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Table2 size={13} /> Table
          </button>
        </div>
      </div>

      {view === 'table' ? (
        <DataTable data={data} series={series} seriesColor={seriesColor} />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 104, bottom: 4, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="#2a2d3a" strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCompact(v)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={110}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#ffffff', fillOpacity: 0.04 }}
                content={<ChartTooltip seriesColor={seriesColor} />}
              />
              <Legend
                iconType="square"
                iconSize={9}
                wrapperStyle={{ paddingTop: 12 }}
                formatter={(value) => <span className="text-xs text-gray-400">{value}</span>}
              />
              {series.map((s, i) => (
                <Bar
                  key={s}
                  dataKey={s}
                  stackId="spend"
                  fill={seriesColor[s]}
                  // A surface-coloured stroke reads as a 2px gap between
                  // segments, which is what keeps neighbouring tags legible.
                  stroke={SURFACE}
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {/* One direct label per bar — the category total, on the last
                      series so it lands past the end of the stack. */}
                  {i === series.length - 1 && (
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(v) => formatCurrency(v)}
                      style={{ fill: '#9ca3af', fontSize: 11 }}
                    />
                  )}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[11px] text-gray-600 mt-4 pt-3 border-t border-[#2a2d3a]">
        A transaction with several tags is split evenly between them, so segments still add up to the
        category total.
        {foldedCount > 0 && ` The ${foldedCount} smallest tags are folded into "Other tags".`}
      </p>
    </div>
  )
}
