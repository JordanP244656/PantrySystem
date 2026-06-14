import { useState, useEffect } from 'react'
import { getCurrentStock } from '../api'

export default function Inventory() {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    getCurrentStock().then(s => { setStock(s); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = stock.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex gap-3">
        <input type="text" placeholder="Search..." value={search}
          onChange={e => setSearch(e.target.value)} className="input flex-1" />
        <button onClick={load} className="btn-secondary px-4 py-2 text-sm">↻</button>
      </div>

      <div className="flex-1 card overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white/30">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/30">
            {stock.length === 0 ? 'No items stocked yet.' : 'No results.'}
          </div>
        ) : filtered.map((item, i) => {
          const low = item.total_remaining <= 2
          const medium = item.total_remaining <= 5 && !low
          return (
            <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.04] last:border-0">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white/90 truncate">{item.item_name}</div>
                <div className="text-white/30 text-xs">{item.size_label}</div>
              </div>
              <div className={`font-bold text-xl tabular-nums ml-4 ${low ? 'text-red-400' : medium ? 'text-yellow-400' : 'text-white'}`}>
                {item.total_remaining}
                {low && <span className="text-xs font-normal ml-1 opacity-70">low</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
