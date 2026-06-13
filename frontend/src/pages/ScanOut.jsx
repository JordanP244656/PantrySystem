import { useState, useRef, useEffect } from 'react'
import { scanOut, getItems, deleteItem } from '../api'
import BarcodeScanner from '../components/BarcodeScanner'

export default function ScanOut() {
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
  }, [])

  const handleBarcode = async (barcode) => {
    if (processing) return
    setProcessing(true)
    setStatus({ type: 'loading', msg: 'Scanning...' })
    try {
      const items = await getItems(barcode)
      if (items.length === 0) {
        setStatus({ type: 'error', msg: 'Not in system — stock it first' })
        setTimeout(() => setStatus(null), 3000)
        setProcessing(false)
        return
      }
      const item = items[0]
      const size = item.sizes.find(s => s.is_default) || item.sizes[0]
      if (!size) {
        setStatus({ type: 'error', msg: `${item.name} has no sizes` })
        setTimeout(() => setStatus(null), 3000)
        setProcessing(false)
        return
      }
      await scanOut({ item_id: item.id, item_size_id: size.id, quantity: 1, performed_by: null })
      setSessionLog(prev => [{ itemName: item.name, itemId: item.id, size: size.size_label, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)])
      setStatus({ type: 'success', msg: item.name, itemId: item.id, itemName: item.name })
      setTimeout(() => setStatus(null), 4000)
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.detail || 'Error — not enough stock?' })
      setTimeout(() => setStatus(null), 3000)
    }
    setProcessing(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-3 px-3 pt-5 pb-28">
      <button
        onClick={() => setShowScanner(true)}
        disabled={processing}
        className="w-full bg-white hover:bg-white/90 active:bg-white/80 disabled:opacity-50 text-black font-bold py-8 rounded-3xl text-2xl transition-all"
      >
        {processing ? '⏳' : '📷 Scan Out'}
      </button>

      <input
        ref={manualRef}
        type="text"
        placeholder="Or type / scan barcode + Enter"
        onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleBarcode(e.target.value); e.target.value = '' } }}
        className="input text-center"
      />

      {status && (
        <div className={`p-5 rounded-2xl text-center transition-all ${
          status.type === 'success' ? 'bg-white/10 border border-white/20' :
          status.type === 'loading' ? 'bg-white/5' :
          'bg-red-500/10 border border-red-500/20'
        }`}>
          {status.type === 'success' && (
            <>
              <div className="text-4xl mb-2">✓</div>
              <div className="font-bold text-white text-lg">{status.msg}</div>
              <button
                onClick={async () => { if (confirm(`Remove "${status.itemName}" from the system entirely?`)) { await deleteItem(status.itemId); setStatus(null) } }}
                className="mt-2 text-xs text-white/30 hover:text-red-400 transition-colors"
              >
                Remove from system
              </button>
            </>
          )}
          {status.type === 'loading' && <div className="text-white/60">{status.msg}</div>}
          {status.type === 'error' && <div className="text-red-400 font-medium">{status.msg}</div>}
        </div>
      )}

      {sessionLog.length > 0 && (
        <div className="card p-4">
          <div className="text-xs text-white/30 uppercase tracking-wider mb-3">This Session</div>
          <ul className="divide-y divide-white/[0.04]">
            {sessionLog.map((entry, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div className="font-medium text-white/80">{entry.itemName}</div>
                <div className="text-white/30 text-xs">{entry.time}</div>
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
