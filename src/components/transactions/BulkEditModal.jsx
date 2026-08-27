import { useState, useEffect } from 'react'
import { useCategories } from '../../contexts/CategoriesContext'
import { storageService } from '../../services/storageService'
import TagInput from '../common/TagInput'
import { X } from 'lucide-react'

// Each field is opt-in: only the ones you tick are written, so a bulk edit
// can never silently blank a column you didn't mean to touch.
function Field({ label, enabled, onToggle, children }) {
  return (
    <div>
      <label className="flex items-center gap-2 mb-1.5 cursor-pointer select-none w-fit">
        <input type="checkbox" checked={enabled} onChange={onToggle} className="w-3.5 h-3.5 accent-teal-400 cursor-pointer" />
        <span className={`text-xs font-medium uppercase tracking-wide ${enabled ? 'text-gray-300' : 'text-gray-600'}`}>
          {label}
        </span>
      </label>
      <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>{children}</div>
    </div>
  )
}

const TAG_MODES = [
  { id: 'add', label: 'Add to existing' },
  { id: 'replace', label: 'Replace all' },
  { id: 'remove', label: 'Remove' },
]

export default function BulkEditModal({ transactions, groups = [], tagSuggestions = [], showGroup, onSaved, onClose }) {
  const { categories } = useCategories()
  const [fields, setFields] = useState({
    category: false, type: false, account: false, group_id: false, notes: false, tags: false,
  })
  const [values, setValues] = useState({
    category: categories[0]?.id || 'other',
    type: 'expense',
    account: 'Main',
    group_id: '',
    notes: '',
    tags: [],
  })
  const [tagMode, setTagMode] = useState('add')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (key) => setFields((f) => ({ ...f, [key]: !f[key] }))
  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }))

  const anySelected = Object.values(fields).some(Boolean)
  const count = transactions.length

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const apply = async () => {
    if (!anySelected) return
    setSaving(true)
    setError('')

    // Everything except tag add/remove is the same value for every row, so it
    // goes out as one request.
    const shared = {}
    if (fields.category) shared.category = values.category
    if (fields.type) shared.type = values.type
    if (fields.account) shared.account = values.account.trim() || 'Main'
    if (fields.group_id) shared.group_id = values.group_id || null
    if (fields.notes) shared.notes = values.notes.trim() || null
    if (fields.tags && tagMode === 'replace') shared.tags = values.tags

    const ids = transactions.map((t) => t.id)

    if (Object.keys(shared).length > 0) {
      const { error: sharedErr } = await storageService.updateTransactions(ids, shared)
      if (sharedErr) { setError(sharedErr.message); setSaving(false); return }
    }

    // Add/remove merges against each row's own tags, so those go per row.
    if (fields.tags && tagMode !== 'replace') {
      const lower = values.tags.map((t) => t.toLowerCase())
      const patches = transactions.map((t) => {
        const current = t.tags || []
        const tags = tagMode === 'add'
          ? [...current, ...values.tags.filter((tag) => !current.some((c) => c.toLowerCase() === tag.toLowerCase()))]
          : current.filter((c) => !lower.includes(c.toLowerCase()))
        return { id: t.id, updates: { tags } }
      })
      const { error: tagErr } = await storageService.updateTransactionsIndividually(patches)
      if (tagErr) { setError(tagErr.message); setSaving(false); return }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">
            Edit {count} transaction{count !== 1 ? 's' : ''}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-5">Tick a field to apply it to every selected transaction.</p>

        <div className="space-y-4">
          <Field label="Category" enabled={fields.category} onToggle={() => toggle('category')}>
            <select className="input-field" value={values.category} onChange={(e) => set('category', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Type" enabled={fields.type} onToggle={() => toggle('type')}>
            <select className="input-field capitalize" value={values.type} onChange={(e) => set('type', e.target.value)}>
              {['expense', 'income', 'transfer'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Tags" enabled={fields.tags} onToggle={() => toggle('tags')}>
            <div className="flex rounded-lg overflow-hidden border border-[#2a2d3a] mb-2">
              {TAG_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTagMode(m.id)}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors cursor-pointer
                    ${tagMode === m.id ? 'bg-teal-400/20 text-teal-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <TagInput value={values.tags} onChange={(t) => set('tags', t)} suggestions={tagSuggestions} />
          </Field>

          <Field label="Notes" enabled={fields.notes} onToggle={() => toggle('notes')}>
            <textarea
              rows={2}
              className="input-field resize-none"
              placeholder="Replaces the note on every selected row"
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>

          <Field label="Account" enabled={fields.account} onToggle={() => toggle('account')}>
            <input type="text" className="input-field" placeholder="Main" value={values.account} onChange={(e) => set('account', e.target.value)} />
          </Field>

          {showGroup && (
            <Field label="Group" enabled={fields.group_id} onToggle={() => toggle('group_id')}>
              <select className="input-field" value={values.group_id} onChange={(e) => set('group_id', e.target.value)}>
                <option value="">None</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-4">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-5">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={apply}
            disabled={saving || !anySelected}
            className="btn-primary flex-1 text-sm disabled:opacity-40"
          >
            {saving ? 'Applying…' : anySelected ? `Apply to ${count}` : 'Pick a field'}
          </button>
        </div>
      </div>
    </div>
  )
}
