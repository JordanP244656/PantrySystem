import { useState, useRef, useEffect } from 'react'
import { scanOut, getItems } from '../api'
import BarcodeScanner from '../components/BarcodeScanner'

export default function ScanOut() {
  const [performer, setPerformer] = useState('')
  const [sessionLog, setSessionLog] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [status, setStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const manualRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target === manualRef.current) return
      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        handleBarcode(barcodeBuffer.current)
        barcodeBuffer.current = ''
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key
        clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = '' }, 100)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [performer])

  const handleBarcode = async (barcode) => {
    if (processing) return
    setProcessing(true)
    setStatus({ type: 'loading', msg: 'Scanning...' })
    try {
      const items = await getItems(barcode)
      if (items.length === 0) {
        setStatus({ type: 'error', msg: `Barcode not in system. Stock it first.` })
        setProcessing(false)
        return
      }
      const item = items[0]
      const size = item.sizes.find(s => s.is_default) || item.sizes[0]
      if (!size) {
        setStatus({ type: 'error', msg: `${item.name} has no sizes set up.` })
        setProcessing(false)
        return
      }
      await scanOut({ item_id: item.id, item_size_id: size.id, quantity: 1, performed_by: performer || null })
      setSessionLog(prev => [{ itemName: item.name, size: size.size_label, time: new Date().toLocaleTimeString(), by: performer }, ...prev.slice(0, 19)])
      setStatus({ type: 'success', msg: item.name })
      setTimeout(() => setStatus(null), 2500)
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.detail || 'Error — not enough stock?' })
      setTimeout(() => setStatus(null), 3000)
    }
    setProcessing(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 px-2">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-slate-800">Scan Out</h1>
        <p className="text-slate-500 text-sm">Scan or search an item to remove it from inventory</p>
      </div>

      <div className="card p-4 space-y-3">
        <input
          type="text"
          value={performer}
          onChange={e => setPerformer(e.target.value)}
          placeholder="Your name (optional)"
          className="input"
        />
        <button
          onClick={() => setShowScanner(true)}
          disabled={processing}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-bold py-6 rounded-2xl text-xl shadow-md transition-all"
        >
          📷 Tap to Scan
        </button>
        <input
          ref={manualRef}
          type="text"
          placeholder="Or type / scan barcode + Enter"
          onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleBarcode(e.target.value); e.target.value = '' } }}
          className="input"
        />
      </div>

      {status && (
        <div className={`p-5 rounded-2xl text-center font-bold text-lg transition-all shadow-sm ${
          status.type === 'success' ? 'bg-green-50 border-2 border-green-200 text-green-800' :
          status.type === 'loading' ? 'bg-blue-50 border-2 border-blue-200 text-blue-700' :
          'bg-red-50 border-2 border-red-200 text-red-700'
        }`}>
          {status.type === 'success' && <div className="text-3xl mb-1">✓</div>}
          {status.msg}
        </div>
      )}

      {sessionLog.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-slate-500 text-xs uppercase tracking-wide mb-3">This Session — {sessionLog.length} scans</h2>
          <ul className="divide-y divide-slate-50">
            {sessionLog.map((entry, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-semibold text-slate-800">{entry.itemName}</div>
                  <div className="text-slate-400 text-xs">{entry.size}{entry.by ? ` · ${entry.by}` : ''}</div>
                </div>
                <div className="text-slate-400 text-xs">{entry.time}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner onDetected={(b) => { setShowScanner(false); handleBarcode(b) }} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
