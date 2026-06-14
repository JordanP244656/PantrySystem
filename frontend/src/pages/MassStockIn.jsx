import { useState, useEffect, useRef } from 'react'
import { massStock, lookupUPC, getItems, createItem } from '../api'
import BarcodeScanner from '../components/BarcodeScanner'

export default function MassStockIn() {
  const [step, setStep] = useState('idle')
  const [items, setItems] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState('')
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const manualRef = useRef(null)

  useEffect(() => {
    if (step !== 'scanning') return
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
  }, [step, items])

  const handleBarcode = async (barcode) => {
    if (scanning) return
    setScanning(true)
    setLastScanned({ status: 'loading' })
    try {
      const existing = await getItems(barcode)
      let item, size, image_url = null
      if (existing.length > 0) {
        item = existing[0]
        size = item.sizes.find(s => s.is_default) || item.sizes[0]
        lookupUPC(barcode).then(p => {
          if (p?.image_url) setItems(prev => prev.map(i => i.item_id === item.id ? { ...i, image_url: p.image_url } : i))
        }).catch(() => {})
      } else {
        const product = await lookupUPC(barcode)
        image_url = product.image_url
        try {
          item = await createItem({ name: product.name, barcode, category: product.category || '', sizes: [{ size_label: product.size || 'Each', unit_count: 1, is_default: true }] })
        } catch {
          const found = await getItems(product.name)
          item = found[0]
        }
        size = item.sizes[0]
      }
      setItems(prev => {
        const idx = prev.findIndex(i => i.item_id === item.id && i.item_size_id === size?.id)
        if (idx >= 0) {
          const u = [...prev]
          u[idx] = { ...u[idx], quantity: u[idx].quantity + 1 }
          setLastScanned({ status: 'added', itemName: u[idx].itemName, quantity: u[idx].quantity, image_url: u[idx].image_url })
          return u
        }
        const entry = { item_id: item.id, item_size_id: size?.id, itemName: item.name, sizeLabel: size?.size_label || 'Each', quantity: 1, image_url }
        setLastScanned({ status: 'added', itemName: item.name, quantity: 1, image_url })
        return [entry, ...prev]
      })
    } catch {
      setPendingBarcode(barcode)
      setLastScanned({ status: 'error' })
    }
    setScanning(false)
  }

  const submit = async () => {
    if (items.length === 0) return
    setLoading(true); setError(null)
    try {
      await massStock({
        store_id: null, performed_by: null, notes: '',
        items: items.map(({ item_id, item_size_id, quantity }) => ({ item_id, item_size_id, quantity, expiration_date: null })),
      })
      setStep('done'); setShowReview(false)
    } catch (e) { setError(e.response?.data?.detail || 'Error') }
    finally { setLoading(false) }
  }

  if (step === 'done') return (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
      <div className="text-8xl">✅</div>
      <h2 className="text-4xl font-bold text-white">{items.length} items stocked</h2>
      <button onClick={() => { setStep('idle'); setItems([]); setLastScanned(null) }}
        className="btn-primary px-10 py-5 text-2xl mt-4">Stock Another Load</button>
    </div>
  )

  if (step === 'idle') return (
    <div className="h-full flex items-center justify-center p-4">
      <button onClick={() => setStep('scanning')}
        className="w-full h-full bg-white hover:bg-white/90 active:bg-white/80 text-black font-bold rounded-3xl text-4xl transition-all">
        🛒 Start Restock
      </button>
    </div>
  )

  return (
    <div className="h-full flex gap-4">
      {/* Left: scan controls */}
      <div className="flex flex-col gap-3 w-64 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-sm">{items.length} items</span>
          <button onClick={() => setShowReview(true)} disabled={items.length === 0}
            className="btn-primary px-6 py-3 text-lg disabled:opacity-30">Done →</button>
        </div>

        <button onClick={() => setShowScanner(true)} disabled={scanning}
          className="flex-1 bg-white hover:bg-white/90 active:bg-white/80 disabled:opacity-50 text-black font-bold rounded-3xl text-2xl transition-all">
          {scanning ? '⏳' : '📷 Scan'}
        </button>

        <input ref={manualRef} type="text" placeholder="Barcode + Enter"
          onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleBarcode(e.target.value); e.target.value = '' } }}
          className="input text-center" />

        {lastScanned && (
          <div className={`rounded-2xl p-3 border ${
            lastScanned.status === 'added' ? 'bg-white/5 border-white/10' :
            lastScanned.status === 'loading' ? 'bg-white/[0.03] border-white/5' :
            'bg-red-500/10 border-red-500/20'}`}>
            {lastScanned.status === 'added' && <>
              <div className="font-semibold text-white text-sm truncate">{lastScanned.itemName}</div>
              <div className="text-white/40 text-xs">×{lastScanned.quantity} in list</div>
            </>}
            {lastScanned.status === 'loading' && <div className="text-white/40 text-sm">Looking up...</div>}
            {lastScanned.status === 'error' && (
              <div className="flex items-center justify-between">
                <div className="text-red-400 text-sm">Not found</div>
                <button onClick={() => setShowManualAdd(true)} className="bg-white text-black text-xs px-2 py-1 rounded-lg font-semibold">+ Add</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: item list */}
      <div className="flex-1 card overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-lg">Scan items to add them</div>
        ) : items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 border-b border-white/[0.04] last:border-0">
            {item.image_url
              ? <img src={item.image_url} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/5 flex-shrink-0" />
              : <div className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0 flex items-center justify-center text-white/20">📦</div>}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white/90 truncate text-sm">{item.itemName}</div>
              <div className="text-white/30 text-xs">{item.sizeLabel}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setItems(prev => { const u = [...prev]; u[i] = { ...u[i], quantity: Math.max(1, u[i].quantity - 1) }; return u })}
                className="w-12 h-12 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-xl">−</button>
              <span className="font-bold text-white w-6 text-center">{item.quantity}</span>
              <button onClick={() => setItems(prev => { const u = [...prev]; u[i] = { ...u[i], quantity: u[i].quantity + 1 }; return u })}
                className="w-12 h-12 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-xl">+</button>
              <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center ml-1 text-xl">✕</button>
            </div>
          </div>
        ))}
      </div>

      {showScanner && <BarcodeScanner onDetected={(b) => { setShowScanner(false); handleBarcode(b) }} onClose={() => setShowScanner(false)} />}

      {showManualAdd && (
        <ManualAddModal barcode={pendingBarcode}
          onAdd={(entry) => { setItems(prev => { const idx = prev.findIndex(i => i.item_id === entry.item_id); if (idx >= 0) { const u = [...prev]; u[idx].quantity += entry.quantity; return u } return [entry, ...prev] }); setShowManualAdd(false); setLastScanned(null) }}
          onClose={() => setShowManualAdd(false)} />
      )}

      {showReview && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={() => setShowReview(false)}>
          <div className="bg-[#141414] border-t border-white/10 rounded-t-3xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-xl text-white">Submit {items.length} items</h2>
            {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-sm border border-red-500/20">{error}</div>}
            <div className="space-y-0 max-h-52 overflow-y-auto divide-y divide-white/[0.04]">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-2">
                  <span className="text-white/70">{item.itemName}</span>
                  <span className="font-bold text-white">×{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setShowReview(false)} className="btn-secondary py-4 text-lg">Back</button>
              <button onClick={submit} disabled={loading} className="btn-primary py-4 text-lg disabled:opacity-50">{loading ? 'Saving...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ManualAddModal({ barcode, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [size, setSize] = useState('Each')
  const [qty, setQty] = useState(1)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name) return
    setSaving(true)
    try {
      let item
      try {
        item = await createItem({ name, barcode: barcode || null, category: '', sizes: [{ size_label: size, unit_count: 1, is_default: true }] })
      } catch {
        const found = await getItems(name)
        item = found[0]
      }
      const s = item.sizes[0]
      onAdd({ item_id: item.id, item_size_id: s?.id, itemName: item.name, sizeLabel: s?.size_label || size, quantity: qty, image_url: null })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={onClose}>
      <div className="bg-[#141414] border-t border-white/10 rounded-t-3xl w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-xl text-white">Add Item</h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Item name" className="input" autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={size} onChange={e => setSize(e.target.value)} placeholder="Size" className="input" />
          <input type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="btn-secondary py-4 text-lg">Cancel</button>
          <button onClick={save} disabled={!name || saving} className="btn-primary py-4 text-lg disabled:opacity-40">{saving ? 'Adding...' : 'Add'}</button>
        </div>
      </div>
    </div>
  )
}
