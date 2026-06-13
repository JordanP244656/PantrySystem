import { useState, useEffect, useRef } from 'react'
import { massStock, lookupUPC, getItems, createItem } from '../api'
import BarcodeScanner from '../components/BarcodeScanner'

const PRESET_STORES = ['Costco', 'Target', 'ShopRite', 'Walmart', 'Whole Foods', 'Other']

export default function MassStockIn() {
  const [step, setStep] = useState('store')
  const [storeName, setStoreName] = useState('')
  const [customStore, setCustomStore] = useState('')
  const [performer, setPerformer] = useState('')
  const [items, setItems] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [lastScanned, setLastScanned] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const manualRef = useRef(null)

  const effectiveStore = storeName === 'Other' ? customStore : storeName

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
      let item, size, image_url = null, purchase_url = null

      if (existing.length > 0) {
        item = existing[0]
        size = item.sizes.find(s => s.is_default) || item.sizes[0]
        // Try to get image from cache
        lookupUPC(barcode, effectiveStore).then(p => {
          if (p?.image_url) setItems(prev => prev.map(i => i.item_id === item.id ? { ...i, image_url: p.image_url, purchase_url: p.purchase_url } : i))
        }).catch(() => {})
      } else {
        const product = await lookupUPC(barcode, effectiveStore)
        image_url = product.image_url
        purchase_url = product.purchase_url
        const sizeLabel = product.size || 'Each'
        try {
          item = await createItem({ name: product.name, barcode, category: product.category || '', sizes: [{ size_label: sizeLabel, unit_count: 1, is_default: true }] })
        } catch {
          const found = await getItems(product.name)
          item = found[0]
        }
        size = item.sizes[0]
      }

      setItems(prev => {
        const idx = prev.findIndex(i => i.item_id === item.id && i.item_size_id === size?.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
          setLastScanned({ status: 'added', itemName: updated[idx].itemName, quantity: updated[idx].quantity, image_url: updated[idx].image_url })
          return updated
        }
        const entry = { item_id: item.id, item_size_id: size?.id, itemName: item.name, sizeLabel: size?.size_label || 'Each', quantity: 1, image_url, purchase_url }
        setLastScanned({ status: 'added', itemName: item.name, quantity: 1, image_url })
        return [entry, ...prev]
      })
    } catch (e) {
      setLastScanned({ status: 'error', msg: 'Not found — try again or skip' })
      setTimeout(() => setLastScanned(null), 3000)
    }
    setScanning(false)
  }

  const submit = async () => {
    if (items.length === 0) return
    setLoading(true)
    setError(null)
    try {
      await massStock({
        store_id: null,
        performed_by: performer || null,
        notes: `Store: ${effectiveStore}`,
        items: items.map(({ item_id, item_size_id, quantity }) => ({ item_id, item_size_id, quantity, expiration_date: null })),
      })
      setStep('done')
      setShowReview(false)
    } catch (e) {
      setError(e.response?.data?.detail || 'Error submitting')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') return (
    <div className="max-w-lg mx-auto text-center py-16 px-4 space-y-4">
      <div className="text-7xl">✅</div>
      <h2 className="text-3xl font-bold text-green-700">{items.length} items stocked!</h2>
      <p className="text-slate-500">From {effectiveStore}</p>
      <button onClick={() => { setStep('store'); setItems([]); setStoreName(''); setLastScanned(null) }}
        className="w-full btn-primary py-4 text-lg mt-4">
        Stock Another Load
      </button>
    </div>
  )

  if (step === 'store') return (
    <div className="max-w-lg mx-auto space-y-4 px-2">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-slate-800">Stock</h1>
        <p className="text-slate-500 text-sm">Select a store and scan items to add to inventory</p>
      </div>
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Where did you shop?</h2>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_STORES.map(s => (
            <button key={s} onClick={() => setStoreName(s)}
              className={`py-3 rounded-xl border-2 font-semibold text-sm transition-all ${storeName === s ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 hover:border-green-300 text-slate-600'}`}>
              {s}
            </button>
          ))}
        </div>
        {storeName === 'Other' && (
          <input type="text" placeholder="Store name" value={customStore} onChange={e => setCustomStore(e.target.value)} className="input" />
        )}
        <input type="text" value={performer} onChange={e => setPerformer(e.target.value)} placeholder="Who's stocking? (optional)" className="input" />
        <button onClick={() => setStep('scanning')} disabled={!storeName || (storeName === 'Other' && !customStore)}
          className="w-full btn-primary py-4 text-lg disabled:opacity-40">
          Start Scanning →
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-4 px-2">
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stocking — {effectiveStore}</h1>
          <p className="text-slate-500 text-sm">{items.length} items · {items.reduce((s, i) => s + i.quantity, 0)} units total</p>
        </div>
        <button onClick={() => setShowReview(true)} disabled={items.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow">
          Done →
        </button>
      </div>

      <div className="card p-4 space-y-2">
        <button onClick={() => setShowScanner(true)} disabled={scanning}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-white font-bold py-6 rounded-2xl text-xl shadow-md">
          {scanning ? '⏳ Looking up...' : '📷 Scan Item'}
        </button>
        <input ref={manualRef} type="text" placeholder="Or type / scan barcode + Enter"
          onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleBarcode(e.target.value); e.target.value = '' } }}
          className="input" />
      </div>

      {lastScanned && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 transition-all ${
          lastScanned.status === 'added' ? 'bg-green-50 border-2 border-green-200' :
          lastScanned.status === 'loading' ? 'bg-slate-50 border-2 border-slate-200' :
          'bg-red-50 border-2 border-red-200'
        }`}>
          {lastScanned.image_url && <img src={lastScanned.image_url} alt="" className="w-14 h-14 object-contain rounded-xl bg-white border shadow-sm flex-shrink-0" />}
          <div>
            {lastScanned.status === 'added' && <>
              <div className="font-bold text-green-800 text-lg">{lastScanned.itemName}</div>
              <div className="text-green-600 text-sm">×{lastScanned.quantity} in list</div>
            </>}
            {lastScanned.status === 'loading' && <div className="text-slate-600 font-medium">Looking up barcode...</div>}
            {lastScanned.status === 'error' && <div className="text-red-700 font-medium">{lastScanned.msg}</div>}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="card overflow-hidden">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-50 last:border-0">
              {item.image_url
                ? <img src={item.image_url} alt="" className="w-11 h-11 object-contain rounded-xl bg-slate-50 border flex-shrink-0" />
                : <div className="w-11 h-11 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-300 text-xl">📦</div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 truncate text-sm">{item.itemName}</div>
                <div className="text-slate-400 text-xs">{item.sizeLabel}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setItems(prev => { const u = [...prev]; u[i] = { ...u[i], quantity: Math.max(1, u[i].quantity - 1) }; return u })}
                  className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-600 text-sm flex items-center justify-center">−</button>
                <span className="font-bold text-green-700 w-5 text-center text-sm">{item.quantity}</span>
                <button onClick={() => setItems(prev => { const u = [...prev]; u[i] = { ...u[i], quantity: u[i].quantity + 1 }; return u })}
                  className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-600 text-sm flex items-center justify-center">+</button>
                <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-sm ml-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showScanner && <BarcodeScanner onDetected={(b) => { setShowScanner(false); handleBarcode(b) }} onClose={() => setShowScanner(false)} />}

      {showReview && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowReview(false)}>
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-xl text-slate-800">Confirm Stock In</h2>
            <p className="text-slate-500 text-sm">{items.length} items from {effectiveStore}</p>
            {error && <div className="bg-red-100 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span className="font-medium text-slate-800">{item.itemName}</span>
                  <span className="font-bold text-green-700">×{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setShowReview(false)} className="btn-secondary py-3">Back</button>
              <button onClick={submit} disabled={loading} className="btn-primary py-3 disabled:opacity-50">
                {loading ? 'Saving...' : 'Submit All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
