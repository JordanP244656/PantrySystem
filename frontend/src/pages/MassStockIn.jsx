import { useState, useEffect } from 'react'
import { getStores, massStock } from '../api'
import ItemSearch from '../components/ItemSearch'

export default function MassStockIn() {
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [performer, setPerformer] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  const [currentItem, setCurrentItem] = useState(null)
  const [qty, setQty] = useState(1)
  const [expDate, setExpDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { getStores().then(setStores) }, [])

  const addItem = () => {
    if (!currentItem?.item || !currentItem?.size) return
    setItems(prev => [...prev, {
      item_id: currentItem.item.id,
      item_size_id: currentItem.size.id,
      itemName: currentItem.item.name,
      sizeLabel: currentItem.size.size_label,
      quantity: qty,
      expiration_date: expDate || null,
    }])
    setCurrentItem(null)
    setQty(1)
    setExpDate('')
  }

  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (items.length === 0) return
    setLoading(true)
    setError(null)
    try {
      await massStock({
        store_id: storeId ? parseInt(storeId) : null,
        performed_by: performer || null,
        notes: notes || null,
        items: items.map(({ item_id, item_size_id, quantity, expiration_date }) => ({ item_id, item_size_id, quantity, expiration_date })),
      })
      setSuccess(true)
      setItems([])
      setStoreId('')
      setPerformer('')
      setNotes('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error submitting')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-700">Stock loaded successfully!</h2>
      <button onClick={() => setSuccess(false)} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">Load More</button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Mass Stock In</h1>

      {error && <div className="bg-red-100 text-red-800 p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Step 1: Session Info</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store / Supplier</label>
            <select
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No specific store</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Performed By</label>
            <input
              type="text"
              value={performer}
              onChange={e => setPerformer(e.target.value)}
              placeholder="Your name"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Weekly delivery"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Step 2: Add Items</h2>
        <ItemSearch onSelect={setCurrentItem} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(parseInt(e.target.value) || 1)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
            <input
              type="date"
              value={expDate}
              onChange={e => setExpDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={addItem}
          disabled={!currentItem?.item || !currentItem?.size}
          className="w-full bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium"
        >
          + Add to List
        </button>
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3">Items to Stock ({items.length})</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2 pr-3">Item</th>
                <th className="pb-2 pr-3">Size</th>
                <th className="pb-2 pr-3">Qty</th>
                <th className="pb-2 pr-3">Exp</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-medium text-slate-800">{item.itemName}</td>
                  <td className="py-2 pr-3 text-slate-500">{item.sizeLabel}</td>
                  <td className="py-2 pr-3">{item.quantity}</td>
                  <td className="py-2 pr-3 text-slate-400 text-xs">{item.expiration_date || '—'}</td>
                  <td className="py-2">
                    <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={submit}
            disabled={loading || items.length === 0}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-base"
          >
            {loading ? 'Submitting...' : `Submit All (${items.length} items)`}
          </button>
        </div>
      )}
    </div>
  )
}
