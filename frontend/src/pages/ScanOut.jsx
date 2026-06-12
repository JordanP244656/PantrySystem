import { useState, useRef, useEffect } from 'react'
import { scanOut, throwOut } from '../api'
import ItemSearch from '../components/ItemSearch'

export default function ScanOut() {
  const [performer, setPerformer] = useState('')
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [sessionLog, setSessionLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        const code = barcodeBuffer.current
        barcodeBuffer.current = ''
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key
        clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = '' }, 100)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const showFeedback = (msg, type) => {
    setFeedback({ msg, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  const doAction = async (type) => {
    if (!selected?.item || !selected?.size) return showFeedback('Select an item and size first.', 'error')
    if (!quantity || quantity < 1) return showFeedback('Quantity must be at least 1.', 'error')
    setLoading(true)
    try {
      const fn = type === 'scan_out' ? scanOut : throwOut
      await fn({ item_id: selected.item.id, item_size_id: selected.size.id, quantity, performed_by: performer, notes })
      const entry = {
        type,
        itemName: selected.item.name,
        size: selected.size.size_label,
        quantity,
        by: performer,
        time: new Date().toLocaleTimeString(),
      }
      setSessionLog(prev => [entry, ...prev])
      showFeedback(`${type === 'scan_out' ? 'Scanned out' : 'Thrown out'} ${quantity}x ${selected.item.name}`, 'success')
      setSelected(null)
      setQuantity(1)
      setNotes('')
    } catch (e) {
      showFeedback(e.response?.data?.detail || 'Error', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Scan Out</h1>

      {feedback && (
        <div className={`p-3 rounded-lg font-medium text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Who's scanning?</label>
          <input
            type="text"
            value={performer}
            onChange={e => setPerformer(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
          <ItemSearch onSelect={setSelected} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(parseInt(e.target.value) || 1)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => doAction('scan_out')}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-base transition-colors"
          >
            Scan Out
          </button>
          <button
            onClick={() => doAction('throw_out')}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-base transition-colors"
          >
            Throw Out
          </button>
        </div>
      </div>

      {sessionLog.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm">This Session</h2>
          <ul className="space-y-1">
            {sessionLog.map((entry, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.type === 'scan_out' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                  {entry.type === 'scan_out' ? 'Out' : 'Toss'}
                </span>
                <span className="text-slate-800 font-medium">{entry.itemName}</span>
                <span className="text-slate-500">{entry.size}</span>
                <span className="text-slate-600">×{entry.quantity}</span>
                {entry.by && <span className="text-slate-400">by {entry.by}</span>}
                <span className="text-slate-400 ml-auto">{entry.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
