import { useState } from 'react'
import { useInvestments } from '../../hooks/useInvestments'
import { storageService } from '../../services/storageService'
import { formatIn } from '../../utils/format'
import ConfirmDelete from '../common/ConfirmDelete'
import InvestmentRow from './InvestmentRow'
import InvestmentForm from './InvestmentForm'
import InvestmentFolderForm from './InvestmentFolderForm'
import { Plus, Pencil, Trash2, Folder, PiggyBank } from 'lucide-react'

function Stat({ label, value, sub, valueClass = 'text-white' }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`amount-font text-base font-semibold truncate ${valueClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

/**
 * One investment folder: its totals on top, the investments it holds below.
 * A recurring plan in the list can be expanded to show its payment schedule.
 */
export default function InvestmentFolderDetail({ user, ownerId, canWrite = true, folderId, onFoldersChanged, onDeleted }) {
  const { investments, folders, loading, refetch } = useInvestments(ownerId)
  const [showForm, setShowForm] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingFolderDelete, setPendingFolderDelete] = useState(false)

  const folder = folders.find((f) => f.id === folderId)
  const rows = investments.filter((i) => i.folder_id === folderId)
  const totals = storageService.totalsByCurrency(rows)

  const target = folder?.target_amount != null ? parseFloat(folder.target_amount) : null
  const targetCurrency = folder?.currency || 'NOK'
  const towardsTarget = totals.find((t) => t.currency === targetCurrency)?.invested || 0
  const pct = target > 0 ? Math.min(100, (towardsTarget / target) * 100) : null
  const otherCurrencies = totals.filter((t) => t.currency !== targetCurrency)

  const confirmDelete = async () => {
    await storageService.deleteInvestment(pendingDelete.id)
    setPendingDelete(null)
    refetch()
  }

  const confirmFolderDelete = async () => {
    await storageService.deleteInvestmentFolder(folderId)
    setPendingFolderDelete(false)
    onFoldersChanged?.()
    onDeleted?.()
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-4 fade-in">
        <div className="card p-5 space-y-3">
          <div className="skeleton h-4 w-48 rounded" />
          <div className="skeleton h-10 w-full rounded" />
        </div>
      </div>
    )
  }

  if (!folder) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-sm text-gray-500">
        This folder no longer exists.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 fade-in">
      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Folder size={18} className="text-teal-400" />
              <h1 className="text-lg font-semibold text-white truncate">{folder.name}</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {rows.length} investment{rows.length !== 1 ? 's' : ''}
              {folder.notes && ` · ${folder.notes}`}
            </p>
          </div>
          {canWrite && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setEditInv(null); setShowForm(true) }}
                className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
              >
                <Plus size={13} /> Add investment
              </button>
              <button
                onClick={() => setShowFolderForm(true)}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => setPendingFolderDelete(true)}
                className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 text-red-400 hover:text-red-300"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>

        {/* One block per currency — never combined into a single figure. */}
        {totals.length === 0 ? (
          <p className="text-sm text-gray-600">Nothing in this folder yet.</p>
        ) : (
          <div className="space-y-4">
            {totals.map((t) => (
              <div key={t.currency}>
                {totals.length > 1 && (
                  <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1.5">{t.currency}</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Invested" value={formatIn(t.invested, t.currency)} />
                  <Stat label="Current value" value={formatIn(t.currentValue, t.currency)} />
                  <Stat
                    label="Gain / loss"
                    value={`${t.gainLoss >= 0 ? '+' : ''}${formatIn(t.gainLoss, t.currency)}`}
                    sub={`${t.gainLossPct >= 0 ? '+' : ''}${t.gainLossPct.toFixed(1)}%`}
                    valueClass={t.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}
                  />
                  <Stat label="Holdings" value={String(t.count)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress towards what the folder is paying for. */}
        {pct != null && (
          <div className="mt-5 pt-4 border-t border-[#2a2d3a]">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>
                <span className="amount-font text-gray-300">{formatIn(towardsTarget, targetCurrency)}</span> of{' '}
                <span className="amount-font">{formatIn(target, targetCurrency)}</span> target
              </span>
              <span className="amount-font">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#1f2233] overflow-hidden">
              <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
            </div>
            {otherCurrencies.length > 0 && (
              <p className="text-[11px] text-gray-600 mt-2">
                Excludes {otherCurrencies.map((t) => formatIn(t.invested, t.currency)).join(' and ')} in
                other currencies — nothing is converted.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Details ───────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#2a2d3a]">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Investments</h2>
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-600">
            <PiggyBank size={36} strokeWidth={1} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">Nothing in this folder yet</p>
            <p className="text-xs text-gray-700 mt-1">Add the down payment, the loan, or a top-up</p>
          </div>
        ) : (
          <div className="p-2">
            {rows.map((inv) => (
              <InvestmentRow
                key={inv.id}
                inv={inv}
                expandable
                canWrite={canWrite}
                onEdit={(i) => { setEditInv(i); setShowForm(true) }}
                onDelete={setPendingDelete}
              />
            ))}
            <p className="text-[11px] text-gray-600 px-4 py-2">
              A recurring plan can be expanded to show what it paid, period by period.
            </p>
          </div>
        )}
      </div>

      {showForm && (
        <InvestmentForm
          user={user}
          ownerId={ownerId}
          investment={editInv}
          folders={folders}
          defaultFolderId={folderId}
          onSaved={() => { setShowForm(false); setEditInv(null); refetch() }}
          onClose={() => { setShowForm(false); setEditInv(null) }}
        />
      )}

      {showFolderForm && (
        <InvestmentFolderForm
          user={user}
          ownerId={ownerId}
          folder={folder}
          onSaved={() => { setShowFolderForm(false); refetch(); onFoldersChanged?.() }}
          onClose={() => setShowFolderForm(false)}
        />
      )}

      {pendingDelete && (
        <ConfirmDelete
          title={`Delete "${pendingDelete.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {pendingFolderDelete && (
        <ConfirmDelete
          title={`Delete folder "${folder.name}"?`}
          message="The folder is removed. Its investments are kept and move to Ungrouped."
          onConfirm={confirmFolderDelete}
          onCancel={() => setPendingFolderDelete(false)}
        />
      )}
    </div>
  )
}
