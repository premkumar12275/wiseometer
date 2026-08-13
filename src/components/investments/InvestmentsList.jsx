import { useState } from 'react'
import { useInvestments } from '../../hooks/useInvestments'
import { storageService } from '../../services/storageService'
import { getInvestmentTypeById } from '../../constants/investmentTypes'
import { formatCurrency } from '../../utils/format'
import InvestmentForm from './InvestmentForm'
import InvestmentImportWizard from './InvestmentImportWizard'
import { Plus, Upload, Pencil, Trash2, PiggyBank } from 'lucide-react'

function ConfirmDelete({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-6 fade-in">
        <h3 className="text-base font-semibold text-white mb-2">Delete "{name}"?</h3>
        <p className="text-sm text-gray-400 mb-5">This action cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 text-sm">Delete</button>
        </div>
      </div>
    </div>
  )
}

function InvestmentRow({ inv, onEdit, onDelete, canWrite }) {
  const type = getInvestmentTypeById(inv.type)
  const gain = parseFloat(inv.current_value) - parseFloat(inv.amount_invested)
  const gainPct = inv.amount_invested > 0 ? (gain / inv.amount_invested) * 100 : 0
  const gainColor = gain >= 0 ? 'text-green-400' : 'text-red-400'
  const fmt = formatCurrency

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[#1f2233] transition-colors rounded-lg group">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
        style={{ backgroundColor: type.color + '22' }}
      >
        {type.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 font-medium truncate">
          {inv.name}
          {inv.symbol && <span className="text-gray-500"> · {inv.symbol}</span>}
        </p>
        <p className="text-xs text-gray-500">
          {inv.purchase_date} · {type.label}
          {inv.quantity != null && ` · ${inv.quantity} units`}
        </p>
      </div>

      <div className="text-right">
        <p className="amount-font text-sm font-semibold text-white">{fmt(inv.current_value)}</p>
        <p className={`amount-font text-xs ${gainColor}`}>
          {gain >= 0 ? '+' : ''}{fmt(gain)} ({gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)
        </p>
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
  )
}

export default function InvestmentsList({ user, ownerId, canWrite = true }) {
  const { investments, invested, currentValue, gainLoss, gainLossPct, loading, refetch } = useInvestments(ownerId)
  const [showForm, setShowForm] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const fmt = formatCurrency
  const gainColor = gainLoss >= 0 ? 'text-green-400' : 'text-red-400'

  const handleSaved = () => {
    setShowForm(false)
    setEditInv(null)
    refetch()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await storageService.deleteInvestment(pendingDelete.id)
    setPendingDelete(null)
    refetch()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {loading ? '—' : (
            <>
              {fmt(currentValue)} current · {fmt(invested)} invested ·{' '}
              <span className={gainColor}>
                {gainLoss >= 0 ? '+' : ''}{fmt(gainLoss)} ({gainLossPct >= 0 ? '+' : ''}{gainLossPct.toFixed(1)}%)
              </span>
            </>
          )}
        </p>
        {canWrite && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="btn-secondary flex items-center gap-2 text-sm py-1.5"
            >
              <Upload size={14} /> Import
            </button>
            <button
              onClick={() => { setEditInv(null); setShowForm(true) }}
              className="btn-primary flex items-center gap-2 text-sm py-1.5"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1">
                <div className="skeleton w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-2.5 w-1/4 rounded" />
                </div>
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : investments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <PiggyBank size={40} strokeWidth={1} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No investments yet</p>
            <p className="text-xs text-gray-700 mt-1">Add one or import your holdings</p>
          </div>
        ) : (
          <div className="p-2">
            {investments.map((inv) => (
              <InvestmentRow
                key={inv.id}
                inv={inv}
                onEdit={(i) => { setEditInv(i); setShowForm(true) }}
                onDelete={setPendingDelete}
                canWrite={canWrite}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <InvestmentForm
          user={user}
          ownerId={ownerId}
          investment={editInv}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditInv(null) }}
        />
      )}

      {pendingDelete && (
        <ConfirmDelete
          name={pendingDelete.name}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0f1117]/95 backdrop-blur-sm fade-in">
          <InvestmentImportWizard
            user={user}
            ownerId={ownerId}
            onClose={() => setShowImport(false)}
            onImported={() => { setShowImport(false); refetch() }}
          />
        </div>
      )}
    </div>
  )
}
