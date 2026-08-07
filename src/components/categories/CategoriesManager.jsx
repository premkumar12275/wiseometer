import { useState } from 'react'
import { useCategories } from '../../contexts/CategoriesContext'
import { Plus, Trash2 } from 'lucide-react'

const COLOR_PALETTE = [
  '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#22c55e', '#06b6d4', '#ef4444', '#64748b', '#14b8a6', '#a855f7',
]

function ConfirmDelete({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-6 fade-in">
        <h3 className="text-base font-semibold text-white mb-2">Delete category “{name}”?</h3>
        <p className="text-sm text-gray-400 mb-5">
          Transactions using this category are kept and will show as “Other”.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 text-sm">Delete</button>
        </div>
      </div>
    </div>
  )
}

export default function CategoriesManager() {
  const { categories, createCategory, deleteCategory } = useCategories()
  const [label, setLabel] = useState('')
  const [emoji, setEmoji] = useState('🏷️')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null) // { id, label }

  const handleAdd = async (e) => {
    e.preventDefault()
    const trimmed = label.trim()
    if (!trimmed) { setError('Enter a category name.'); return }
    setError('')
    setSaving(true)
    const { error: err } = await createCategory({ label: trimmed, emoji: emoji || '🏷️', color })
    setSaving(false)
    if (err) { setError(err.message); return }
    setLabel('')
    setEmoji('🏷️')
    setColor(COLOR_PALETTE[0])
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 fade-in">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Add form */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">New category</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-16">
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Emoji</label>
                <input
                  type="text"
                  className="input-field text-center text-lg"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                  aria-label="Category emoji"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Subscriptions"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-offset-[#14171f] ring-white scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
              <Plus size={14} /> {saving ? 'Adding…' : 'Add category'}
            </button>
          </form>
        </div>

        {/* Category list */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">All categories</h2>
          <div className="space-y-1">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1f2233] transition-colors group">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: c.color + '22' }}
                >
                  {c.emoji}
                </div>
                <span className="flex-1 text-sm text-gray-200">{c.label}</span>
                {c.custom ? (
                  <button
                    onClick={() => setPendingDelete({ id: c.id, label: c.label })}
                    className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    aria-label={`Delete ${c.label}`}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-gray-600 px-2">Default</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDelete
          name={pendingDelete.label}
          onConfirm={async () => { await deleteCategory(pendingDelete.id); setPendingDelete(null) }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
