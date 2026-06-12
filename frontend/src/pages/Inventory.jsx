import { useState, useEffect } from 'react'
import { getItems, createItem, updateItem, deleteItem, addItemSize, deleteItemSize, getCurrentStock } from '../api'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [stock, setStock] = useState({})
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', barcode: '', category: '', description: '' })
  const [sizeForm, setSizeForm] = useState({ size_label: '', unit_count: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = () => {
    getItems(query || undefined).then(setItems)
    getCurrentStock().then(data => {
      const map = {}
      data.forEach(s => {
        if (!map[s.item_id]) map[s.item_id] = []
        map[s.item_id].push(s)
      })
      setStock(map)
    })
  }

  useEffect(() => { load() }, [query])

  const openAdd = () => { setForm({ name: '', barcode: '', category: '', description: '' }); setEditItem(null); setShowAddModal(true) }
  const openEdit = (item) => { setForm({ name: item.name, barcode: item.barcode || '', category: item.category || '', description: item.description || '' }); setEditItem(item); setShowAddModal(true) }

  const save = async () => {
    setLoading(true); setError(null)
    try {
      if (editItem) { await updateItem(editItem.id, form) }
      else { await createItem({ ...form, sizes: [] }) }
      setShowAddModal(false)
      load()
    } catch (e) { setError(e.response?.data?.detail || 'Error') }
    finally { setLoading(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this item?')) return
    await deleteItem(id)
    load()
  }

  const addSize = async (itemId) => {
    if (!sizeForm.size_label) return
    await addItemSize(itemId, sizeForm)
    setSizeForm({ size_label: '', unit_count: 1 })
    load()
  }

  const removeSize = async (itemId, sizeId) => {
    await deleteItemSize(itemId, sizeId)
    load()
  }

  const getTotalStock = (itemId) => {
    const s = stock[itemId] || []
    return s.reduce((sum, x) => sum + x.total_remaining, 0)
  }

  const getStatus = (itemId) => {
    const total = getTotalStock(itemId)
    if (total === 0) return { label: 'Out', cls: 'bg-red-100 text-red-700' }
    if (total < 5) return { label: 'Low', cls: 'bg-yellow-100 text-yellow-700' }
    return { label: 'OK', cls: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
        <button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Item</button>
      </div>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search items..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Sizes</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const status = getStatus(item.id)
              return (
                <>
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {item.name}
                      {item.barcode && <span className="ml-2 text-xs text-slate-400 font-mono">{item.barcode}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.category || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{item.sizes.map(s => s.size_label).join(', ') || '—'}</td>
                    <td className="px-4 py-3 font-medium">{getTotalStock(item.id)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span></td>
                    <td className="px-4 py-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      <button onClick={() => remove(item.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                  {expanded === item.id && (
                    <tr key={`${item.id}-exp`} className="bg-slate-50 border-t border-slate-100">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-medium text-slate-700 mb-2 text-xs uppercase tracking-wide">Sizes</h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {item.sizes.map(s => (
                                <span key={s.id} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs">
                                  {s.size_label} {s.unit_count > 1 && `(×${s.unit_count})`}
                                  <button onClick={() => removeSize(item.id, s.id)} className="text-red-400 hover:text-red-600 ml-1">×</button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={sizeForm.size_label}
                                onChange={e => setSizeForm(f => ({ ...f, size_label: e.target.value }))}
                                placeholder="Size label (e.g. 12oz)"
                                className="border border-slate-300 rounded px-2 py-1 text-xs"
                              />
                              <input
                                type="number"
                                value={sizeForm.unit_count}
                                onChange={e => setSizeForm(f => ({ ...f, unit_count: parseInt(e.target.value) || 1 }))}
                                placeholder="Units"
                                className="border border-slate-300 rounded px-2 py-1 text-xs w-20"
                              />
                              <button onClick={() => addSize(item.id)} className="bg-slate-700 text-white px-2 py-1 rounded text-xs">+ Add Size</button>
                            </div>
                          </div>
                          {(stock[item.id] || []).length > 0 && (
                            <div>
                              <h3 className="font-medium text-slate-700 mb-2 text-xs uppercase tracking-wide">Stock Batches</h3>
                              <table className="text-xs w-full">
                                <thead>
                                  <tr className="text-slate-400">
                                    <th className="text-left pr-4 pb-1">Size</th>
                                    <th className="text-left pr-4 pb-1">Remaining</th>
                                    <th className="text-left pr-4 pb-1">Expires</th>
                                    <th className="text-left pb-1">Received</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(stock[item.id] || []).flatMap(s =>
                                    s.batches.map(b => (
                                      <tr key={b.id}>
                                        <td className="pr-4 py-0.5">{s.size_label}</td>
                                        <td className="pr-4 py-0.5 font-medium">{b.quantity_remaining}</td>
                                        <td className={`pr-4 py-0.5 ${b.expiration_date ? 'text-yellow-600' : 'text-slate-400'}`}>{b.expiration_date || '—'}</td>
                                        <td className="py-0.5 text-slate-400">{new Date(b.received_at).toLocaleDateString()}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="font-bold text-lg text-slate-800">{editItem ? 'Edit Item' : 'Add Item'}</h2>
            {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
            {['name', 'barcode', 'category', 'description'].map(field => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{field}</label>
                <input
                  type="text"
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm">
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-medium text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
