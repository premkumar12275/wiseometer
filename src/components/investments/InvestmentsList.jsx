import { useState } from 'react'
import { useInvestments } from '../../hooks/useInvestments'
import { storageService } from '../../services/storageService'
import { formatIn } from '../../utils/format'
import ConfirmDelete from '../common/ConfirmDelete'
import InvestmentRow from './InvestmentRow'
import InvestmentForm from './InvestmentForm'
import InvestmentFolderForm from './InvestmentFolderForm'
import InvestmentImportWizard from './InvestmentImportWizard'
import {
  Plus, Upload, Pencil, Trash2, PiggyBank, FolderPlus, Folder,
  ChevronDown, ChevronRight, Repeat,
} from 'lucide-react'

function FolderSection({ folder, investments, canWrite, onAdd, onOpen, onEditFolder, onDeleteFolder, onEdit, onDelete }) {
  const [open, setOpen] = useState(true)
  // One total per currency — a folder can legitimately hold a NOK account and
  // an INR loan, and those must never be added together.
  const totals = storageService.totalsByCurrency(investments)

  // The target is denominated in the folder's currency, so progress counts only
  // the holdings that share it.
  const target = folder?.target_amount != null ? parseFloat(folder.target_amount) : null
  const targetCurrency = folder?.currency || 'NOK'
  const towardsTarget = totals.find((t) => t.currency === targetCurrency)?.invested || 0
  const pct = target > 0 ? Math.min(100, (towardsTarget / target) * 100) : null
  const otherCurrencies = totals.filter((t) => t.currency !== targetCurrency)

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2d3a]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            aria-label={open ? 'Collapse folder' : 'Expand folder'}
          >
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
          <Folder size={15} className={folder ? 'text-teal-400' : 'text-gray-600'} />
          {folder ? (
            <button
              onClick={() => onOpen(folder)}
              title="Open folder"
              className="text-sm font-semibold text-white flex-1 truncate text-left hover:text-teal-400 transition-colors cursor-pointer"
            >
              {folder.name}
            </button>
          ) : (
            <h3 className="text-sm font-semibold text-white flex-1 truncate">Ungrouped</h3>
          )}

          <div className="text-xs text-gray-500 text-right">
            {totals.length === 0 ? '—' : totals.map((t) => (
              <p key={t.currency} className="amount-font whitespace-nowrap">
                {formatIn(t.invested, t.currency)} in · {formatIn(t.currentValue, t.currency)} now
              </p>
            ))}
          </div>

          {canWrite && folder && (
            <div className="flex gap-1">
              <button
                onClick={() => onAdd(folder.id)}
                title="Add investment to this folder"
                className="p-1.5 rounded-md text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors cursor-pointer"
              >
                <Plus size={13} />
              </button>
              <button
                onClick={() => onEditFolder(folder)}
                className="p-1.5 rounded-md text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors cursor-pointer"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => onDeleteFolder(folder)}
                className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Progress towards what the folder is paying for. */}
        {pct != null && (
          <div className="mt-2.5 pl-[26px]">
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
              <span>
                <span className="amount-font text-gray-300">{formatIn(towardsTarget, targetCurrency)}</span> of{' '}
                <span className="amount-font">{formatIn(target, targetCurrency)}</span>
              </span>
              <span className="amount-font">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1f2233] overflow-hidden">
              <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
            </div>
            {otherCurrencies.length > 0 && (
              <p className="text-[11px] text-gray-600 mt-1.5">
                Excludes {otherCurrencies.map((t) => formatIn(t.invested, t.currency)).join(' and ')} in
                other currencies — nothing is converted.
              </p>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="p-2">
          {investments.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">
              Nothing in this folder yet.
            </p>
          ) : (
            investments.map((inv) => (
              <InvestmentRow key={inv.id} inv={inv} onEdit={onEdit} onDelete={onDelete} canWrite={canWrite} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function InvestmentsList({ user, ownerId, canWrite = true, onFoldersChanged, onSelectFolder }) {
  const { investments, folders, currencies, loading, refetch } = useInvestments(ownerId)
  const [showForm, setShowForm] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [formFolderId, setFormFolderId] = useState('')
  const [showFolderForm, setShowFolderForm] = useState(false)
  const [editFolder, setEditFolder] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingFolderDelete, setPendingFolderDelete] = useState(null)
  const [showImport, setShowImport] = useState(false)

  const handleSaved = () => {
    setShowForm(false)
    setEditInv(null)
    setFormFolderId('')
    refetch()
  }

  const handleFolderSaved = () => {
    setShowFolderForm(false)
    setEditFolder(null)
    refetch()
    onFoldersChanged?.() // the sidebar keeps its own folder list
  }

  const confirmDelete = async () => {
    await storageService.deleteInvestment(pendingDelete.id)
    setPendingDelete(null)
    refetch()
  }

  const confirmFolderDelete = async () => {
    await storageService.deleteInvestmentFolder(pendingFolderDelete.id)
    setPendingFolderDelete(null)
    refetch()
    onFoldersChanged?.()
  }

  const openAdd = (folderId = '') => {
    setEditInv(null)
    setFormFolderId(folderId)
    setShowForm(true)
  }

  const ungrouped = investments.filter((i) => !i.folder_id)

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* One row per currency held. Amounts are never converted, so there is
            deliberately no single portfolio figure here. */}
        <div className="text-sm text-gray-500 space-y-0.5">
          {loading ? '—' : currencies.length === 0 ? 'Nothing tracked yet' : currencies.map((c) => (
            <p key={c.currency}>
              <span className="text-[10px] uppercase tracking-wide text-gray-600 mr-1.5">{c.currency}</span>
              {formatIn(c.currentValue, c.currency)} current · {formatIn(c.invested, c.currency)} invested ·{' '}
              <span className={c.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                {c.gainLoss >= 0 ? '+' : ''}{formatIn(c.gainLoss, c.currency)}
                {' '}({c.gainLossPct >= 0 ? '+' : ''}{c.gainLossPct.toFixed(1)}%)
              </span>
            </p>
          ))}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditFolder(null); setShowFolderForm(true) }}
              className="btn-secondary flex items-center gap-2 text-sm py-1.5"
            >
              <FolderPlus size={14} /> New folder
            </button>
            <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2 text-sm py-1.5">
              <Upload size={14} /> Import
            </button>
            <button onClick={() => openAdd()} className="btn-primary flex items-center gap-2 text-sm py-1.5">
              <Plus size={14} /> Add
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-4 space-y-3">
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
      ) : investments.length === 0 && folders.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-600">
          <PiggyBank size={40} strokeWidth={1} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">No investments yet</p>
          <p className="text-xs text-gray-700 mt-1">Add one, import your holdings, or start a folder</p>
        </div>
      ) : (
        <>
          {folders.map((folder) => (
            <FolderSection
              key={folder.id}
              folder={folder}
              investments={investments.filter((i) => i.folder_id === folder.id)}
              canWrite={canWrite}
              onAdd={openAdd}
              onOpen={onSelectFolder}
              onEditFolder={(f) => { setEditFolder(f); setShowFolderForm(true) }}
              onDeleteFolder={setPendingFolderDelete}
              onEdit={(i) => { setEditInv(i); setShowForm(true) }}
              onDelete={setPendingDelete}
            />
          ))}

          {/* Only worth a section of its own once folders exist to contrast with. */}
          {ungrouped.length > 0 && (
            folders.length > 0 ? (
              <FolderSection
                folder={null}
                investments={ungrouped}
                canWrite={canWrite}
                onAdd={openAdd}
                onEdit={(i) => { setEditInv(i); setShowForm(true) }}
                onDelete={setPendingDelete}
              />
            ) : (
              <div className="card p-2">
                {ungrouped.map((inv) => (
                  <InvestmentRow
                    key={inv.id}
                    inv={inv}
                    onEdit={(i) => { setEditInv(i); setShowForm(true) }}
                    onDelete={setPendingDelete}
                    canWrite={canWrite}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}

      {showForm && (
        <InvestmentForm
          user={user}
          ownerId={ownerId}
          investment={editInv}
          folders={folders}
          defaultFolderId={formFolderId}
          onSaved={handleSaved}
          onClose={() => { setShowForm(false); setEditInv(null); setFormFolderId('') }}
        />
      )}

      {showFolderForm && (
        <InvestmentFolderForm
          user={user}
          ownerId={ownerId}
          folder={editFolder}
          onSaved={handleFolderSaved}
          onClose={() => { setShowFolderForm(false); setEditFolder(null) }}
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
          title={`Delete folder "${pendingFolderDelete.name}"?`}
          message="The folder is removed. Its investments are kept and move to Ungrouped."
          onConfirm={confirmFolderDelete}
          onCancel={() => setPendingFolderDelete(null)}
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
