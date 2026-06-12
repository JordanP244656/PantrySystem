import { useState, useRef, useEffect } from 'react'
import { scanOut, getItems, lookupUPC } from '../api'
import BarcodeScanner from '../components/BarcodeScanner'

export default function ScanOut() {
  const [performer, setPerformer] = useState('')
  const [sessionLog, setSessionLog] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [status, setStatus] = useState(null) // {type, msg, item}
  const [processing, setProcessing] = useState(false)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const manualRef = useRef(null)

  // USB scanner input
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
      // Find item by barcode
      const items = await getItems(barcode)
      if (items.length === 0) {
        setStatus({ type: 'error', msg: `Barcode ${barcode} not in system yet. Add it via Mass Stock first.` })
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
      const entry = { itemName: item.name, size: size.size_label, time: new Date().toLocaleTimeString(), by: performer }
      setSessionLog(prev => [entry, ...prev.slice(0, 19)])
      setStatus({ type: 'success', msg: `✓ ${item.name}`, item })
      setTimeout(() => setStatus(null), 2000)
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.detail || 'Error' })
      setTimeout(() => setStatus(null), 3000)
    }
    setProcessing(false)
  }

  const handleManual = (e) => {
    if (e.key === 'Enter' && e.target.value) {
      handleBarcode(e.target.value)
      e.target.value = ''
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 px-2">
      <h1 className="text-2xl font-bold text-slate-800">Scan Out</h1>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <input
          type="text"
          value={performer}
          onChange={e => setPerformer(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={() => setShowScanner(true)}
          disabled={processing}
          className="w-full bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white font-bold py-5 rounded-2xl text-xl"
        >
          📷 Tap to Scan
        </button>

        <input
          ref={manualRef}
          type="text"
          placeholder="Or type / scan barcode here + Enter"
          onKeyDown={handleManual}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {status && (
        <div className={`p-4 rounded-2xl text-center font-semibold text-lg transition-all ${
          status.type === 'success' ? 'bg-green-100 text-green-800' :
          status.type === 'loading' ? 'bg-blue-100 text-blue-700' :
          'bg-red-100 text-red-700'
        }`}>
          {status.msg}
        </div>
      )}

      {sessionLog.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-600 text-sm mb-3">This Session ({sessionLog.length})</h2>
          <ul className="space-y-2">
            {sessionLog.map((entry, i) => (
              <li key={i} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">{entry.itemName}</span>
                  <span className="text-slate-400 text-sm ml-2">{entry.size}</span>
                </div>
                <div className="text-right">
                  {entry.by && <div className="text-xs text-slate-400">{entry.by}</div>}
                  <div className="text-xs text-slate-400">{entry.time}</div>
                </div>
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
