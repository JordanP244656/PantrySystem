import { useState, useRef, useEffect } from 'react'
import { scanOut, getItems, deleteItem } from '../api'
import BarcodeScanner from '../components/BarcodeScanner'

export default function ScanOut() {
  const [sessionLog, setSessionLog] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [status, setStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [qtyPicker, setQtyPicker] = useState(null)
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
      if (size.unit_count > 1) {
        setStatus(null)
        setQtyPicker({ item, size })
        setProcessing(false)
        return
      }
      await doScanOut(item, size, 1)
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.detail || 'Error — not enough stock?' })
      setTimeout(() => setStatus(null), 3000)
    }
    setProcessing(false)
  }

  const doScanOut = async (item, size, quantity) => {
    try {
      await scanOut({ item_id: item.id, item_size_id: size.id, quantity, performed_by: null })
      setSessionLog(prev => [{ itemName: item.name, itemId: item.id, size: size.size_label, quantity, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 19)])
      setStatus({ type: 'success', msg: item.name, itemId: item.id, itemName: item.name })
      setTimeout(() => setStatus(null), 4000)
    } catch (e) {
      setStatus({ type: 'error', msg: e.response?.data?.detail || 'Error — not enough stock?' })
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div className="h-full flex gap-4">
      {/* Left: scan button + status */}
      <div className="flex flex-col gap-3 w-64 flex-shrink-0">
        <button
          onClick={() => setShowScanner(true)}
          disabled={processing}
          className="flex-1 bg-white hover:bg-white/90 active:bg-white/80 disabled:opacity-50 text-black font-bold rounded-3xl text-3xl transition-all"
        >
          {processing ? '⏳' : '📷 Scan Out'}
        </button>

        <input
          ref={manualRef}
          type="text"
          placeholder="Barcode + Enter"
          onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleBarcode(e.target.value); e.target.value = '' } }}
          className="input text-center"
        />

        {status && (
          <div className={`p-4 rounded-2xl text-center ${
            status.type === 'success' ? 'bg-white/10 border border-white/20' :
            status.type === 'loading' ? 'bg-white/5' :
            'bg-red-500/10 border border-red-500/20'
          }`}>
            {status.type === 'success' && (
              <>
                <div className="text-4xl mb-1">✓</div>
                <div className="font-bold text-white">{status.msg}</div>
                <button
                  onClick={async () => { if (confirm(`Remove "${status.itemName}" from the system?`)) { await deleteItem(status.itemId); setStatus(null) } }}
                  className="mt-1 text-xs text-white/30 hover:text-red-400 transition-colors"
                >Remove from system</button>
              </>
            )}
            {status.type === 'loading' && <div className="text-white/60">{status.msg}</div>}
            {status.type === 'error' && <div className="text-red-400 font-medium">{status.msg}</div>}
          </div>
        )}
      </div>

      {/* Right: session log */}
      <div className="flex-1 card overflow-y-auto">
        {sessionLog.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-lg">Scan items to log them</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            <div className="px-4 py-2 text-xs text-white/30 uppercase tracking-wider">This Session</div>
            {sessionLog.map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="font-medium text-white/80">{entry.itemName}</div>
                <div className="text-white/30 text-xs">{entry.time}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showScanner && (
        <BarcodeScanner onDetected={(b) => { setShowScanner(false); handleBarcode(b) }} onClose={() => setShowScanner(false)} />
      )}

      {qtyPicker && (
        <QtyPickerModal
          item={qtyPicker.item}
          size={qtyPicker.size}
          onConfirm={async (qty) => {
            const pick = qtyPicker
            setQtyPicker(null)
            setProcessing(true)
            await doScanOut(pick.item, pick.size, qty)
            setProcessing(false)
          }}
          onClose={() => setQtyPicker(null)}
        />
      )}
    </div>
  )
}

function QtyPickerModal({ item, size, onConfirm, onClose }) {
  const options = Array.from({ length: size.unit_count }, (_, i) => i + 1)
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={onClose}>
      <div className="bg-[#141414] border-t border-white/10 rounded-t-3xl w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="font-bold text-xl text-white">{item.name}</h2>
          <p className="text-white/40 text-sm mt-0.5">Pack of {size.unit_count} — how many?</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {options.map(n => (
            <button key={n} onClick={() => onConfirm(n)}
              className={`py-5 rounded-2xl font-bold text-xl transition-all border ${n === size.unit_count ? 'bg-white text-black border-white' : 'border-white/10 bg-white/[0.04] text-white'}`}>
              {n === size.unit_count ? `All ${n}` : n}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full btn-secondary py-3">Cancel</button>
      </div>
    </div>
  )
}
