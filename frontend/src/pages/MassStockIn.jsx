import { useState, useEffect, useRef } from 'react'
import { massStock, lookupUPC, getItems, createItem, addItemSize } from '../api'
import BarcodeScanner from '../components/BarcodeScanner'

const PRESET_STORES = ['Costco', 'Target', 'ShopRite', 'Walmart', 'Whole Foods', 'Other']

export default function MassStockIn() {
  const [step, setStep] = useState('store') // store -> scanning -> review -> done
  const [storeName, setStoreName] = useState('')
  const [performer, setPerformer] = useState('')
  const [items, setItems] = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [lookupStatus, setLookupStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const barcodeBuffer = useRef('')
  const barcodeTimer = useRef(null)
  const qtyInputRef = useRef(null)
  const [pendingItem, setPendingItem] = useState(null)
  const [pendingQty, setPendingQty] = useState(1)
  const [pendingExp, setPendingExp] = useState('')

  // USB barcode scanner support
  useEffect(() => {
    if (step !== 'scanning') return
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' && e.target !== document.activeElement) return
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
  }, [step])

  const handleBarcode = async (barcode) => {
    setLookupStatus({ type: 'loading', msg: `Looking up ${barcode}...` })
    try {
      // Check if item already exists in our system
      const existing = await getItems(barcode)
      if (existing.length > 0) {
        const item = existing[0]
        const size = item.sizes.find(s => s.is_default) || item.sizes[0]
        setPendingItem({ item, size, barcode, isNew: false })
        setLookupStatus({ type: 'found', msg: `Found: ${item.name}` })
        setPendingQty(1)
        setTimeout(() => qtyInputRef.current?.focus(), 100)
        return
      }
      // Look up from Open Food Facts
      const product = await lookupUPC(barcode)
      setPendingItem({ product, barcode, isNew: true })
      setLookupStatus({ type: 'new', msg: `New item: ${product.name}` })
      setPendingQty(1)
      setTimeout(() => qtyInputRef.current?.focus(), 100)
    } catch (e) {
      setPendingItem({ barcode, isNew: true, product: { name: '', size: '', category: '' } })
      setLookupStatus({ type: 'unknown', msg: 'Unknown barcode — enter details manually' })
      setTimeout(() => qtyInputRef.current?.focus(), 100)
    }
  }

  const addToList = async () => {
    if (!pendingItem) return
    if (pendingItem.isNew) {
      const name = pendingItem.product?.name || pendingItem.manualName
      if (!name) { setLookupStatus({ type: 'error', msg: 'Enter a name for this item' }); return }
      // Create the item in the system
      const sizeLabel = pendingItem.product?.size || pendingItem.manualSize || 'Each'
      let newItem
      try {
        newItem = await createItem({ name, barcode: pendingItem.barcode, category: pendingItem.product?.category || '', sizes: [{ size_label: sizeLabel, unit_count: 1, is_default: true }] })
      } catch (e) {
        // Item might already exist with same name
        const existing = await getItems(name)
        newItem = existing[0]
      }
      const size = newItem.sizes[0]
      setItems(prev => [...prev, { item_id: newItem.id, item_size_id: size.id, itemName: newItem.name, sizeLabel: size.size_label, quantity: pendingQty, expiration_date: pendingExp || null, barcode: pendingItem.barcode }])
    } else {
      const { item, size } = pendingItem
      setItems(prev => {
        const existing = prev.findIndex(i => i.item_id === item.id && i.item_size_id === size?.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing].quantity += pendingQty
          return updated
        }
        return [...prev, { item_id: item.id, item_size_id: size?.id, itemName: item.name, sizeLabel: size?.size_label || 'Each', quantity: pendingQty, expiration_date: pendingExp || null, barcode: pendingItem.barcode }]
      })
    }
    setPendingItem(null)
    setLookupStatus(null)
    setPendingQty(1)
    setPendingExp('')
  }

  const submit = async () => {
    if (items.length === 0) return
    setLoading(true)
    setError(null)
    try {
      await massStock({
        store_id: null,
        performed_by: performer || null,
        notes: `Store: ${storeName}`,
        items: items.map(({ item_id, item_size_id, quantity, expiration_date }) => ({ item_id, item_size_id, quantity, expiration_date })),
      })
      setStep('done')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error submitting')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-700">{items.length} items stocked from {storeName}!</h2>
      <button onClick={() => { setStep('store'); setItems([]); setStoreName(''); setPendingItem(null); setLookupStatus(null) }}
        className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold">
        Stock Another Load
      </button>
    </div>
  )

  if (step === 'store') return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Mass Stock In</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-700 text-lg">Where did you shop?</h2>
        <div className="grid grid-cols-2 gap-3">
          {PRESET_STORES.map(s => (
            <button key={s} onClick={() => setStoreName(s)}
              className={`py-4 rounded-xl border-2 font-semibold text-sm transition-colors ${storeName === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}>
              {s}
            </button>
          ))}
        </div>
        {storeName === 'Other' && (
          <input type="text" placeholder="Store name" onChange={e => setStoreName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Who's stocking? (optional)</label>
          <input type="text" value={performer} onChange={e => setPerformer(e.target.value)} placeholder="Your name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setStep('scanning')} disabled={!storeName}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-lg">
          Start Scanning →
        </button>
      </div>
    </div>
  )

  if (step === 'scanning') return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Scanning — {storeName}</h1>
          <p className="text-slate-500 text-sm">{items.length} items added</p>
        </div>
        <button onClick={() => setStep('review')}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold">
          Done →
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={() => setShowScanner(true)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold text-lg">
            📷 Scan with Camera
          </button>
          <div className="flex-1 relative">
            <input type="text" placeholder="Or type / scan barcode here..."
              className="w-full h-full border-2 border-slate-300 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={e => { if (e.key === 'Enter') { handleBarcode(e.target.value); e.target.value = '' } }} />
          </div>
        </div>

        {lookupStatus && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            lookupStatus.type === 'loading' ? 'bg-blue-50 text-blue-700' :
            lookupStatus.type === 'found' ? 'bg-green-50 text-green-700' :
            lookupStatus.type === 'new' ? 'bg-yellow-50 text-yellow-700' :
            lookupStatus.type === 'error' ? 'bg-red-50 text-red-700' :
            'bg-orange-50 text-orange-700'
          }`}>
            {lookupStatus.msg}
          </div>
        )}

        {pendingItem && (
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
            {pendingItem.isNew && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Item Name</label>
                  <input type="text" defaultValue={pendingItem.product?.name || ''}
                    onChange={e => setPendingItem(p => ({ ...p, product: { ...p.product, name: e.target.value } }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Size</label>
                    <input type="text" defaultValue={pendingItem.product?.size || ''}
                      onChange={e => setPendingItem(p => ({ ...p, product: { ...p.product, size: e.target.value } }))}
                      placeholder="e.g. 12oz, Case/24"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <input type="text" defaultValue={pendingItem.product?.category || ''}
                      onChange={e => setPendingItem(p => ({ ...p, product: { ...p.product, category: e.target.value } }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            )}
            {!pendingItem.isNew && (
              <div className="font-semibold text-slate-800">{pendingItem.item.name} — {pendingItem.size?.size_label}</div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                <input ref={qtyInputRef} type="number" min="1" value={pendingQty}
                  onChange={e => setPendingQty(parseInt(e.target.value) || 1)}
                  onKeyDown={e => { if (e.key === 'Enter') addToList() }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Expiry (optional)</label>
                <input type="date" value={pendingExp} onChange={e => setPendingExp(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button onClick={addToList} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-lg font-medium text-sm">
              ✓ Add to List
            </button>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-700 mb-2 text-sm">Items Added ({items.length})</h3>
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">{item.itemName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{item.sizeLabel}</span>
                  <span className="font-bold text-blue-700">×{item.quantity}</span>
                  <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showScanner && <BarcodeScanner onDetected={(b) => { setShowScanner(false); handleBarcode(b) }} onClose={() => setShowScanner(false)} />}
    </div>
  )

  if (step === 'review') return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Review — {storeName}</h1>
      {error && <div className="bg-red-100 text-red-800 p-3 rounded-lg text-sm">{error}</div>}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b text-xs">
            <th className="pb-2 pr-4">Item</th><th className="pb-2 pr-4">Size</th><th className="pb-2 pr-4">Qty</th><th className="pb-2">Exp</th>
          </tr></thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="py-2 pr-4 font-medium">{item.itemName}</td>
                <td className="py-2 pr-4 text-slate-500">{item.sizeLabel}</td>
                <td className="py-2 pr-4 font-bold text-blue-700">{item.quantity}</td>
                <td className="py-2 text-slate-400 text-xs">{item.expiration_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setStep('scanning')} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-xl font-semibold">← Back</button>
        <button onClick={submit} disabled={loading || items.length === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold">
          {loading ? 'Saving...' : `Submit ${items.length} Items`}
        </button>
      </div>
    </div>
  )
}
