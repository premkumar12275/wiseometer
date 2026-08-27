import { useState } from 'react'
import { useCategories } from '../../contexts/CategoriesContext'
import { storageService } from '../../services/storageService'
import { formatCurrency } from '../../utils/format'
import TagInput from '../common/TagInput'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Trash2, Pencil, Check, X, Upload } from 'lucide-react'

// Small inputs sized for the table cells — the full-size `input-field` is far
// too tall to keep an edited row on one line.
const CELL_INPUT =
  'w-full bg-[#1f2233] border border-[#2a2d3a] rounded px-1.5 py-1 text-xs text-gray-200 outline-none focus:border-teal-400 placeholder-gray-600'

const TYPE_STYLE = {
  income: { color: 'text-green-400', Icon: ArrowUpRight },
  transfer: { color: 'text-slate-400', Icon: ArrowLeftRight },
  expense: { color: 'text-red-400', Icon: ArrowDownRight },
}

const typeStyle = (type) => TYPE_STYLE[type] || TYPE_STYLE.expense

export function DisplayRow({ tx, groups, selected, onToggleSelect, onEdit, onDelete, canWrite, showGroup }) {
  const { getCategoryById } = useCategories()
  const cat = getCategoryById(tx.category)
  const { color, Icon } = typeStyle(tx.type)
  const groupName = groups.find((g) => g.id === tx.group_id)?.name

  return (
    <tr className={`border-b border-[#2a2d3a]/50 last:border-0 transition-colors group ${selected ? 'bg-teal-400/10' : 'hover:bg-[#1f2233]'}`}>
      {canWrite && (
        <td className="px-3 py-2.5">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(tx.id)}
            className="w-4 h-4 accent-teal-400 cursor-pointer"
            aria-label="Select transaction"
          />
        </td>
      )}

      <td className="px-3 py-2.5 text-gray-400 amount-font whitespace-nowrap">{tx.date}</td>

      <td className="px-3 py-2.5 max-w-[260px]">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-gray-200">
            {tx.description || <span className="text-gray-600 italic">No description</span>}
          </span>
          {tx.source === 'import' && (
            <Upload size={11} className="text-gray-600 flex-shrink-0" title={tx.import_file || 'Imported'} />
          )}
        </div>
      </td>

      <td className="px-3 py-2.5 whitespace-nowrap">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-gray-300"
          style={{ backgroundColor: cat.color + '22' }}
        >
          {cat.emoji} {cat.label}
        </span>
      </td>

      <td className="px-3 py-2.5 max-w-[180px]">
        {tx.tags?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tx.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-400/10 text-teal-400">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-700">—</span>
        )}
      </td>

      <td className="px-3 py-2.5 max-w-[200px]">
        {tx.notes ? (
          <span className="text-gray-400 line-clamp-2" title={tx.notes}>{tx.notes}</span>
        ) : (
          <span className="text-gray-700">—</span>
        )}
      </td>

      <td className={`px-3 py-2.5 capitalize whitespace-nowrap ${color}`}>{tx.type}</td>

      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{tx.account || 'Main'}</td>

      {showGroup && (
        <td className="px-3 py-2.5 whitespace-nowrap">
          {groupName ? <span className="text-gray-400">{groupName}</span> : <span className="text-gray-700">—</span>}
        </td>
      )}

      <td className={`px-3 py-2.5 text-right amount-font font-semibold whitespace-nowrap ${color}`}>
        <span className="inline-flex items-center gap-1">
          <Icon size={12} />
          {formatCurrency(tx.amount)}
        </span>
      </td>

      {canWrite && (
        <td className="px-3 py-2.5">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(tx)}
              className="p-1.5 rounded-md text-gray-500 hover:text-teal-400 hover:bg-teal-400/10 transition-colors cursor-pointer"
              aria-label="Edit transaction"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(tx)}
              className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              aria-label="Delete transaction"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      )}
    </tr>
  )
}

// Editing happens in place: this row replaces DisplayRow for the transaction
// being edited, so it mounts fresh and seeds its own draft from that row.
export function EditRow({ tx, groups, onCancel, onSaved, showGroup, canWrite, tagSuggestions, colSpan }) {
  const { categories } = useCategories()
  const [draft, setDraft] = useState({
    date: tx.date,
    description: tx.description || '',
    notes: tx.notes || '',
    tags: tx.tags || [],
    amount: String(tx.amount),
    type: tx.type,
    category: tx.category,
    account: tx.account || 'Main',
    group_id: tx.group_id || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const save = async () => {
    const amount = parseFloat(draft.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    setSaving(true)
    setError('')
    const { error: saveErr } = await storageService.updateTransaction(tx.id, {
      date: draft.date,
      description: draft.description.trim() || null,
      notes: draft.notes.trim() || null,
      tags: draft.tags,
      amount,
      type: draft.type,
      category: draft.category,
      account: draft.account.trim() || 'Main',
      group_id: draft.group_id || null,
    })
    setSaving(false)
    if (saveErr) setError(saveErr.message)
    else onSaved()
  }

  // Enter saves, Escape cancels. TagInput calls preventDefault on its own
  // Enter (to add a chip), so skip those — that keypress was already consumed.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
    else if (e.key === 'Enter' && !e.defaultPrevented) { e.preventDefault(); save() }
  }

  return (
    <>
      <tr className="bg-teal-400/[0.04] border-b border-[#2a2d3a]/50" onKeyDown={onKeyDown}>
        {canWrite && <td className="px-3 py-2" />}

        <td className="px-3 py-2">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => set('date', e.target.value)}
            className={`${CELL_INPUT} amount-font`}
            autoFocus
          />
        </td>

        <td className="px-3 py-2">
          <input
            type="text"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Description"
            className={`${CELL_INPUT} min-w-[160px]`}
          />
        </td>

        <td className="px-3 py-2">
          <select value={draft.category} onChange={(e) => set('category', e.target.value)} className={`${CELL_INPUT} cursor-pointer`}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </td>

        <td className="px-3 py-2 min-w-[150px]">
          <TagInput compact value={draft.tags} onChange={(t) => set('tags', t)} suggestions={tagSuggestions} placeholder="Add a tag…" />
        </td>

        <td className="px-3 py-2">
          <input
            type="text"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Notes"
            className={`${CELL_INPUT} min-w-[140px]`}
          />
        </td>

        <td className="px-3 py-2">
          <select value={draft.type} onChange={(e) => set('type', e.target.value)} className={`${CELL_INPUT} cursor-pointer capitalize`}>
            {['expense', 'income', 'transfer'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </td>

        <td className="px-3 py-2">
          <input
            type="text"
            value={draft.account}
            onChange={(e) => set('account', e.target.value)}
            placeholder="Main"
            className={`${CELL_INPUT} w-24`}
          />
        </td>

        {showGroup && (
          <td className="px-3 py-2">
            <select value={draft.group_id} onChange={(e) => set('group_id', e.target.value)} className={`${CELL_INPUT} cursor-pointer`}>
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </td>
        )}

        <td className="px-3 py-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={draft.amount}
            onChange={(e) => set('amount', e.target.value)}
            className={`${CELL_INPUT} amount-font text-right w-24`}
          />
        </td>

        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button
              onClick={save}
              disabled={saving}
              className="p-1.5 rounded-md text-teal-400 hover:bg-teal-400/10 transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Save changes"
            >
              <Check size={14} />
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-[#1f2233] transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Cancel editing"
            >
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
      {error && (
        <tr className="bg-teal-400/[0.04] border-b border-[#2a2d3a]/50">
          <td colSpan={colSpan} className="px-3 pb-2 text-red-400">{error}</td>
        </tr>
      )}
    </>
  )
}
