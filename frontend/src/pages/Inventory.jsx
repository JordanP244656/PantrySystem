import { useState, useEffect } from 'react'
import { getCurrentStock } from '../api'

export default function Inventory() {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    getCurrentStock()
      .then(s => { setStock(s); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = stock.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-lg mx-auto px-3 pt-5 pb-28 space-y-3">
      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="input"
      />

      {loading ? (
        <div className="text-center py-16 text-white/30">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          {stock.length === 0 ? 'No items stocked yet.' : 'No results.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {filtered.map((item, i) => {
            const low = item.total_remaining <= 2
            const medium = item.total_remaining <= 5 && !low
            return (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white/90 text-sm truncate">{item.item_name}</div>
                  <div className="text-white/30 text-xs">{item.size_label}</div>
                </div>
                <div className={`font-bold text-lg tabular-nums ml-4 ${low ? 'text-red-400' : medium ? 'text-yellow-400' : 'text-white'}`}>
                  {item.total_remaining}
                  {low && <span className="text-xs font-normal ml-1 text-red-400/70">low</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <button onClick={load} className="w-full btn-secondary py-3 text-sm">↻ Refresh</button>
    </div>
  )
}
