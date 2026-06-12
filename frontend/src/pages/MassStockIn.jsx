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
    setLastScanned({ status: 'loading', barcode })

    try {
      // Check if already in our system
      const existing = await getItems(barcode)
      let item, size

      if (existing.length > 0) {
        item = existing[0]
        size = item.sizes.find(s => s.is_default) || item.sizes[0]
      } else {
        // Look up from UPC databases
        const product = await lookupUPC(barcode, effectiveStore)
        const sizeLabel = product.size || 'Each'
        try {
          item = await createItem({ name: product.name, barcode, category: product.category || '', sizes: [{ size_label: sizeLabel, unit_count: 1, is_default: true }] })
        } catch {
          const found = await getItems(product.name)
          item = found[0]
        }
        size = item.sizes[0]
      }

      // Merge with existing or add new
      setItems(prev => {
        const idx = prev.findIndex(i => i.item_id === item.id && i.item_size_id === size?.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
          setLastScanned({ status: 'added', itemName: updated[idx].itemName, quantity: updated[idx].quantity, image_url: updated[idx].image_url })
          return updated
        }
        const newEntry = {
          item_id: item.id,
          item_size_id: size?.id,
          itemName: item.name,
          sizeLabel: size?.size_label || 'Each',
          quantity: 1,
          image_url: null,
        }
        // Try to get image from UPC cache
        lookupUPC(barcode, effectiveStore).then(p => {
          if (p.image_url) setItems(prev2 => prev2.map(i => i.item_id === item.id ? { ...i, image_url: p.image_url, purchase_url: p.purchase_url } : i))
        }).catch(() => {})
        setLastScanned({ status: 'added', itemName: item.name, quantity: 1, image_url: null })
        return [newEntry, ...prev]
      })
    } catch (e) {
      setLastScanned({ status: 'error', barcode, msg: e.response?.data?.detail || 'Not found — scan again or skip' })
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
    } catch (e) {
      setError(e.response?.data?.detail || 'Error submitting')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-700">{items.length} items stocked!</h2>
      <p className="text-slate-500 mt-1">From {effectiveStore}</p>
      <button onClick={() => { setStep('store'); setItems([]); setStoreName(''); setLastScanned(null) }}
        className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl font-semibold text-lg w-full">
        Stock Another Load
      </button>
    </div>
  )

  if (step === 'store') return (
    <div className="max-w-lg mx-auto space-y-5 px-2">
      <h1 className="text-2xl font-bold text-slate-800">Mass Stock In</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Where did you shop?</h2>
        <div className="grid grid-cols-2 gap-3">
          {PRESET_STORES.map(s => (
            <button key={s} onClick={() => setStoreName(s)}
              className={`py-4 rounded-2xl border-2 font-semibold transition-colors ${storeName === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
              {s}
            </button>
          ))}
        </div>
        {storeName === 'Other' && (
          <input type="text" placeholder="Store name" value={customStore} onChange={e => setCustomStore(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}
        <input type="text" value={performer} onChange={e => setPerformer(e.target.value)} placeholder="Who's stocking? (optional)"
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => setStep('scanning')} disabled={!storeName || (storeName === 'Other' && !customStore)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-4 rounded-2xl text-lg">
          Start Scanning →
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-4 px-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{effectiveStore}</h1>
          <p className="text-slate-500 text-sm">{items.length} items · {items.reduce((s, i) => s + i.quantity, 0)} units</p>
        </div>
        <button onClick={() => setStep('review')} disabled={items.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl font-semibold">
          Done →
        </button>
      </div>

      <div className="space-y-2">
        <button onClick={() => setShowScanner(true)} disabled={scanning}
          className="w-full bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white font-bold py-5 rounded-2xl text-xl">
          {scanning ? '⏳ Looking up...' : '📷 Scan Item'}
        </button>
        <input ref={manualRef} type="text" placeholder="Or type / scan barcode + Enter"
          onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleBarcode(e.target.value); e.target.value = '' } }}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {lastScanned && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${lastScanned.status === 'added' ? 'bg-green-50 border border-green-200' : lastScanned.status === 'loading' ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
          {lastScanned.image_url && <img src={lastScanned.image_url} alt="" className="w-12 h-12 object-contain rounded-lg bg-white border" />}
          <div>
            {lastScanned.status === 'added' && <>
              <div className="font-semibold text-green-800">{lastScanned.itemName}</div>
              <div className="text-green-600 text-sm">×{lastScanned.quantity} total</div>
            </>}
            {lastScanned.status === 'loading' && <div className="text-blue-700 font-medium">Looking up barcode...</div>}
            {lastScanned.status === 'error' && <div className="text-red-700 font-medium">{lastScanned.msg}</div>}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              {item.image_url
                ? <img src={item.image_url} alt="" className="w-10 h-10 object-contain rounded-lg bg-slate-50 border flex-shrink-0" />
                : <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-400 text-lg">📦</div>
              }
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{item.itemName}</div>
                <div className="text-slate-400 text-xs">{item.sizeLabel}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setItems(prev => { const u = [...prev]; u[i] = { ...u[i], quantity: Math.max(1, u[i].quantity - 1) }; return u })} className="w-7 h-7 rounded-full bg-slate-200 font-bold text-slate-600 flex items-center justify-center">−</button>
                <span className="font-bold text-blue-700 w-6 text-center">{item.quantity}</span>
                <button onClick={() => setItems(prev => { const u = [...prev]; u[i] = { ...u[i], quantity: u[i].quantity + 1 }; return u })} className="w-7 h-7 rounded-full bg-slate-200 font-bold text-slate-600 flex items-center justify-center">+</button>
                <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-sm">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showScanner && <BarcodeScanner onDetected={(b) => { setShowScanner(false); handleBarcode(b) }} onClose={() => setShowScanner(false)} />}

      {step === 'review' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <h2 className="font-bold text-xl">Confirm Stock In</h2>
            {error && <div className="bg-red-100 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-medium">{item.itemName}</span>
                  <span className="font-bold text-blue-700">×{item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep('scanning')} className="bg-slate-200 text-slate-700 py-3 rounded-2xl font-semibold">Back</button>
              <button onClick={submit} disabled={loading} className="bg-green-600 text-white py-3 rounded-2xl font-semibold disabled:opacity-50">
                {loading ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
