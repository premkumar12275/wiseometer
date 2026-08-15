import { useState } from 'react'
import { X } from 'lucide-react'

// Chip-style multi-tag input with autocomplete against previously-used tags.
export default function TagInput({ value = [], onChange, suggestions = [], placeholder = 'Add a tag…', compact = false, disabled = false }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const addTag = (raw) => {
    const tag = raw.trim()
    if (!tag) return
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) { setInput(''); return }
    onChange([...value, tag])
    setInput('')
  }

  const removeTag = (tag) => onChange(value.filter((t) => t !== tag))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(input.toLowerCase()))
    .filter((s) => !value.some((t) => t.toLowerCase() === s.toLowerCase()))
    .slice(0, 6)

  return (
    <div className="relative">
      <div
        className={`input-field flex flex-wrap items-center gap-1.5 focus-within:border-teal-400 ${
          compact ? 'min-h-[26px] py-1 px-1.5' : 'min-h-[38px] py-1.5'
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className={`flex items-center gap-1 bg-teal-400/10 text-teal-400 rounded-full ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'}`}
          >
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-teal-200 cursor-pointer">
                <X size={compact ? 9 : 11} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            placeholder={value.length === 0 ? placeholder : ''}
            className={`flex-1 min-w-[60px] bg-transparent outline-none text-gray-200 placeholder-gray-600 ${compact ? 'text-[11px]' : 'text-sm'}`}
          />
        )}
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[#2a2d3a] bg-[#1a1d27] shadow-lg overflow-hidden">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-[#1f2233] cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
