import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'
import { useCategories } from '../../contexts/CategoriesContext'
import { formatCurrency, LOCALE } from '../../utils/format'

const ACTION_META = {
  insert: { icon: Plus, label: 'added a transaction', color: 'text-emerald-400 bg-emerald-500/10' },
  update: { icon: Pencil, label: 'edited a transaction', color: 'text-blue-400 bg-blue-500/10' },
  delete: { icon: Trash2, label: 'deleted a transaction', color: 'text-red-400 bg-red-500/10' },
}

const FIELD_LABELS = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  type: 'Type',
  category: 'Category',
  account: 'Account',
  group_id: 'Group',
}

// Fields intentionally not shown in a diff — identifiers and bookkeeping
// columns that aren't meaningful to a human reading the change log.
const SKIP_FIELDS = new Set(['id', 'user_id', 'created_at', 'import_file', 'source'])

function formatWhen(iso) {
  return new Date(iso).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatField(field, value, { getCategoryById, groups }) {
  if (value == null) return '—'
  if (field === 'amount') return formatCurrency(value)
  if (field === 'category') return getCategoryById(value).label
  if (field === 'group_id') return groups.find((g) => g.id === value)?.name || 'Unknown group'
  if (field === 'type') return value[0].toUpperCase() + value.slice(1)
  return String(value)
}

function snapshotLine(data, ctx) {
  const cat = ctx.getCategoryById(data.category)
  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <span>{cat.emoji}</span>
      <span className="flex-1 truncate">{data.description || cat.label}</span>
      <span className="text-gray-400">{formatCurrency(data.amount)}</span>
    </div>
  )
}

function diffLines(oldData, newData, ctx) {
  const fields = Object.keys(FIELD_LABELS).filter(
    (f) => !SKIP_FIELDS.has(f) && oldData[f] !== newData[f],
  )
  if (fields.length === 0) return null
  return (
    <div className="space-y-1 text-sm">
      {fields.map((f) => (
        <div key={f} className="flex gap-2 text-gray-400">
          <span className="w-24 flex-shrink-0 text-gray-500">{FIELD_LABELS[f]}</span>
          <span className="line-through text-gray-600">{formatField(f, oldData[f], ctx)}</span>
          <span>→</span>
          <span className="text-gray-200">{formatField(f, newData[f], ctx)}</span>
        </div>
      ))}
    </div>
  )
}

function ActivityEntry({ entry, ctx }) {
  const meta = ACTION_META[entry.action]
  const Icon = meta.icon
  const actor = entry.changed_by_name || (entry.changed_by_username ? `@${entry.changed_by_username}` : 'Someone')

  return (
    <div className="flex gap-3 px-3 py-3 rounded-lg hover:bg-[#1f2233] transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-gray-200">
            <span className="font-medium">{actor}</span> {meta.label}
          </p>
          <span className="text-xs text-gray-500 flex-shrink-0">{formatWhen(entry.changed_at)}</span>
        </div>
        <div className="mt-1">
          {entry.action === 'insert' && snapshotLine(entry.new_data, ctx)}
          {entry.action === 'delete' && snapshotLine(entry.old_data, ctx)}
          {entry.action === 'update' && diffLines(entry.old_data, entry.new_data, ctx)}
        </div>
      </div>
    </div>
  )
}

export default function ActivityLog({ ownerId, groups = [] }) {
  const { history, loading } = useTransactionHistory(ownerId)
  const { getCategoryById } = useCategories()
  const ctx = { getCategoryById, groups }

  return (
    <div className="flex-1 overflow-y-auto p-6 fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Activity</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No changes yet.</p>
          ) : (
            <div className="space-y-1">
              {history.map((entry) => (
                <ActivityEntry key={entry.id} entry={entry} ctx={ctx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
