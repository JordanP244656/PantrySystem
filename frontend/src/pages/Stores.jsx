import { useState, useEffect } from 'react'
import { getStores, createStore, updateStore, deleteStore, getStoreItems, addStoreItemLink, updateStoreItemLink, deleteStoreItemLink, getItems } from '../api'

export default function Stores() {
  const [stores, setStores] = useState([])
  const [selected, setSelected] = useState(null)
  const [storeItems, setStoreItems] = useState([])
  const [showStoreModal, setShowStoreModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [editStore, setEditStore] = useState(null)
  const [editLink, setEditLink] = useState(null)
  const [storeForm, setStoreForm] = useState({ name: '', website_url: '', notes: '' })
  const [linkForm, setLinkForm] = useState({ item_id: '', item_size_id: '', store_item_number: '', purchase_url: '', price: '' })
  const [allItems, setAllItems] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => { getStores().then(setStores); getItems().then(setAllItems) }, [])
  useEffect(() => { if (selected) getStoreItems(selected.id).then(setStoreItems) }, [selected])

  const openAddStore = () => { setStoreForm({ name: '', website_url: '', notes: '' }); setEditStore(null); setShowStoreModal(true) }
  const openEditStore = (s) => { setStoreForm({ name: s.name, website_url: s.website_url || '', notes: s.notes || '' }); setEditStore(s); setShowStoreModal(true) }

  const saveStore = async () => {
    setError(null)
    try {
      if (editStore) { const s = await updateStore(editStore.id, storeForm); if (selected?.id === s.id) setSelected(s) }
      else { await createStore(storeForm) }
      getStores().then(setStores)
      setShowStoreModal(false)
    } catch (e) { setError(e.response?.data?.detail || 'Error') }
  }

  const removeStore = async (id) => {
    if (!confirm('Delete store?')) return
    await deleteStore(id)
    if (selected?.id === id) setSelected(null)
    getStores().then(setStores)
  }

  const openAddLink = () => { setLinkForm({ item_id: '', item_size_id: '', store_item_number: '', purchase_url: '', price: '' }); setEditLink(null); setShowLinkModal(true) }
  const openEditLink = (l) => { setLinkForm({ store_item_number: l.store_item_number || '', purchase_url: l.purchase_url || '', price: l.price || '' }); setEditLink(l); setShowLinkModal(true) }

  const saveLink = async () => {
    setError(null)
    try {
      if (editLink) {
        await updateStoreItemLink(selected.id, editLink.id, { store_item_number: linkForm.store_item_number, purchase_url: linkForm.purchase_url, price: linkForm.price ? parseFloat(linkForm.price) : null })
      } else {
        await addStoreItemLink(selected.id, {
          item_id: parseInt(linkForm.item_id),
          item_size_id: linkForm.item_size_id ? parseInt(linkForm.item_size_id) : null,
          store_item_number: linkForm.store_item_number || null,
          purchase_url: linkForm.purchase_url || null,
          price: linkForm.price ? parseFloat(linkForm.price) : null,
        })
      }
      getStoreItems(selected.id).then(setStoreItems)
      setShowLinkModal(false)
    } catch (e) { setError(e.response?.data?.detail || 'Error') }
  }

  const removeLink = async (linkId) => {
    await deleteStoreItemLink(selected.id, linkId)
    getStoreItems(selected.id).then(setStoreItems)
  }

  const selectedItemSizes = allItems.find(i => i.id === parseInt(linkForm.item_id))?.sizes || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Stores</h1>
        <button onClick={openAddStore} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Store</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-2">
          {stores.map(store => (
            <div
              key={store.id}
              onClick={() => setSelected(store)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-colors ${selected?.id === store.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="font-semibold text-slate-800">{store.name}</div>
              {store.website_url && (
                <a href={store.website_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-500 hover:underline truncate block">{store.website_url}</a>
              )}
              {store.notes && <div className="text-xs text-slate-400 mt-1">{store.notes}</div>}
              <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEditStore(store)} className="text-xs text-blue-600 hover:underline">Edit</button>
                <button onClick={() => removeStore(store.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {stores.length === 0 && <div className="text-slate-400 text-sm">No stores yet.</div>}
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">{selected.name} — Items</h2>
                <button onClick={openAddLink} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium">+ Link Item</button>
              </div>
              {storeItems.length === 0 ? (
                <div className="text-slate-400 text-sm">No items linked yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b text-xs">
                      <th className="pb-2 pr-3">Item</th>
                      <th className="pb-2 pr-3">Size</th>
                      <th className="pb-2 pr-3">Item #</th>
                      <th className="pb-2 pr-3">Price</th>
                      <th className="pb-2 pr-3">Link</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeItems.map(link => (
                      <tr key={link.id} className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-medium">{link.item?.name}</td>
                        <td className="py-2 pr-3 text-slate-500">{link.item_size?.size_label || '—'}</td>
                        <td className="py-2 pr-3 font-mono text-xs text-slate-500">{link.store_item_number || '—'}</td>
                        <td className="py-2 pr-3">{link.price ? `$${link.price.toFixed(2)}` : '—'}</td>
                        <td className="py-2 pr-3">
                          {link.purchase_url ? (
                            <a href={link.purchase_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Buy</a>
                          ) : '—'}
                        </td>
                        <td className="py-2 space-x-2 text-right">
                          <button onClick={() => openEditLink(link)} className="text-blue-600 hover:underline text-xs">Edit</button>
                          <button onClick={() => removeLink(link.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">Select a store to manage its items.</div>
          )}
        </div>
      </div>

      {showStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="font-bold text-lg">{editStore ? 'Edit Store' : 'Add Store'}</h2>
            {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
            {[['name','Name'],['website_url','Website URL'],['notes','Notes']].map(([field,label]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type="text" value={storeForm[field]} onChange={e => setStoreForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={saveStore} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm">Save</button>
              <button onClick={() => setShowStoreModal(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-medium text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="font-bold text-lg">{editLink ? 'Edit Item Link' : 'Link Item to Store'}</h2>
            {error && <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
            {!editLink && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
                  <select value={linkForm.item_id} onChange={e => setLinkForm(f => ({ ...f, item_id: e.target.value, item_size_id: '' }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select item...</option>
                    {allItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Size (optional)</label>
                  <select value={linkForm.item_size_id} onChange={e => setLinkForm(f => ({ ...f, item_size_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Any size</option>
                    {selectedItemSizes.map(s => <option key={s.id} value={s.id}>{s.size_label}</option>)}
                  </select>
                </div>
              </>
            )}
            {[['store_item_number','Store Item #'],['purchase_url','Purchase URL'],['price','Price']].map(([field,label]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <input type={field === 'price' ? 'number' : 'text'} step="0.01" value={linkForm[field]}
                  onChange={e => setLinkForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={saveLink} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm">Save</button>
              <button onClick={() => setShowLinkModal(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-medium text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
