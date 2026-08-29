// Bespoke modal, per the app's convention: backdrop + card panel.
export default function ConfirmDelete({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card w-full max-w-sm p-6 fade-in">
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-5">{message || 'This action cannot be undone.'}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 text-sm">Delete</button>
        </div>
      </div>
    </div>
  )
}
