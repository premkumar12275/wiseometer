import { useEffect } from 'react'
import { X } from 'lucide-react'
import { version } from '../../../package.json'
import { CHANGELOG } from '../../constants/changelog'

export default function ChangelogModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 fade-in max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Wiseometer v{version}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 cursor-pointer" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-sm font-semibold text-teal-400">v{entry.version}</span>
                <span className="text-xs text-gray-500">{entry.date}</span>
              </div>
              <ul className="space-y-1 list-disc list-inside">
                {entry.changes.map((change, i) => (
                  <li key={i} className="text-sm text-gray-300">{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
