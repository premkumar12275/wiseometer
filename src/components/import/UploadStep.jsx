import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, FileText, X } from 'lucide-react'

export default function UploadStep({ onFileReady }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)

  const accept = ['.xlsx', '.xls', '.pdf']

  const handleFile = (f) => {
    if (!f) return
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!accept.includes(ext)) {
      alert('Only .xlsx, .xls, and .pdf files are supported.')
      return
    }
    setFile(f)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const fmt = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const isPdf = file?.name?.toLowerCase().endsWith('.pdf')

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer
          ${dragging ? 'border-teal-400 bg-teal-400/5' : 'border-[#2a2d3a] hover:border-[#3a3d4a]'}
        `}
        onClick={() => document.getElementById('file-input').click()}
      >
        <Upload size={36} strokeWidth={1.5} className={dragging ? 'text-teal-400' : 'text-gray-600'} />
        <p className="text-sm font-medium text-gray-300">Drop your bank statement here</p>
        <p className="text-xs text-gray-600">Supports Excel (.xlsx, .xls) and PDF</p>
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {file && (
        <div className="card flex items-center gap-3 p-4 fade-in">
          {isPdf
            ? <FileText size={22} className="text-red-400 flex-shrink-0" />
            : <FileSpreadsheet size={22} className="text-green-400 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{fmt(file.size)}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-gray-600 hover:text-gray-300 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      <button
        disabled={!file}
        onClick={() => onFileReady(file)}
        className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue →
      </button>
    </div>
  )
}
