import { useState, useRef, useEffect } from 'react'
import { getItems } from '../api'
import BarcodeScanner from './BarcodeScanner'

export default function ItemSearch({ onSelect, showSizeSelect = true }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (query.length < 1) { setResults([]); setShowDropdown(false); return }
    const t = setTimeout(() => {
      getItems(query).then(items => { setResults(items); setShowDropdown(true) })
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const selectItem = (item) => {
    setSelectedItem(item)
    setQuery(item.name)
    setShowDropdown(false)
    const def = item.sizes.find(s => s.is_default) || item.sizes[0]
    if (def) {
      setSelectedSize(def)
      if (!showSizeSelect) onSelect({ item, size: def })
    }
  }

  const handleSizeChange = (sizeId) => {
    const size = selectedItem.sizes.find(s => s.id === parseInt(sizeId))
    setSelectedSize(size)
    if (selectedItem && size) onSelect({ item: selectedItem, size })
  }

  const handleBarcodeDetected = (barcode) => {
    getItems(barcode).then(items => {
      if (items.length > 0) selectItem(items[0])
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search item by name or barcode..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showDropdown && results.length > 0 && (
            <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {results.map(item => (
                <button
                  key={item.id}
                  onMouseDown={() => selectItem(item)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                >
                  <span className="font-medium">{item.name}</span>
                  {item.category && <span className="text-slate-500 ml-2 text-xs">{item.category}</span>}
                  {item.barcode && <span className="text-slate-400 ml-2 text-xs font-mono">{item.barcode}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium text-slate-700"
          title="Scan barcode with camera"
        >
          📷
        </button>
      </div>
      {showSizeSelect && selectedItem && selectedItem.sizes.length > 0 && (
        <select
          value={selectedSize?.id || ''}
          onChange={e => handleSizeChange(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select size...</option>
          {selectedItem.sizes.map(s => (
            <option key={s.id} value={s.id}>{s.size_label}</option>
          ))}
        </select>
      )}
      {showScanner && (
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />
      )}
    </div>
  )
}
