import { useState, useEffect } from 'react'
import { getUsageReport, getThrowOutReport, getExpiringReport, getTopUsed } from '../api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'

const TABS = ['Usage', 'Top Used', 'Throw Outs', 'Expiring']
const DAY_OPTIONS = [7, 14, 30, 90]

export default function Reports() {
  const [tab, setTab] = useState('Usage')
  const [days, setDays] = useState(30)
  const [usageData, setUsageData] = useState([])
  const [topUsed, setTopUsed] = useState([])
  const [throwOuts, setThrowOuts] = useState([])
  const [expiring, setExpiring] = useState([])
  const [expiryDays, setExpiryDays] = useState(14)

  useEffect(() => {
    getUsageReport({ days }).then(setUsageData)
    getTopUsed({ days, n: 10 }).then(setTopUsed)
    getThrowOutReport({ days }).then(setThrowOuts)
  }, [days])

  useEffect(() => {
    getExpiringReport({ days: expiryDays }).then(setExpiring)
  }, [expiryDays])

  const chartData = (() => {
    const byDate = {}
    usageData.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date }
      byDate[r.date][r.item_name] = (byDate[r.date][r.item_name] || 0) + r.quantity_used
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  })()

  const itemNames = [...new Set(usageData.map(r => r.item_name))]
  const COLORS = ['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2','#db2777','#65a30d']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        {tab !== 'Expiring' && (
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {DAY_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${days === d ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {d}d
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Usage' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-4">Usage Over Time (last {days} days)</h2>
          {chartData.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {itemNames.slice(0, 8).map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-slate-500 border-b text-xs">
                    <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Item</th><th className="pb-2">Qty Used</th>
                  </tr></thead>
                  <tbody>
                    {usageData.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-1.5 pr-4 text-slate-400 text-xs">{r.date}</td>
                        <td className="py-1.5 pr-4 font-medium">{r.item_name}</td>
                        <td className="py-1.5">{r.quantity_used}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Top Used' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-4">Top 10 Most Used (last {days} days)</h2>
          {topUsed.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsed} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="item_name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="total_used" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === 'Throw Outs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-4">Throw Outs (last {days} days)</h2>
          {throwOuts.length === 0 ? <Empty msg="No throw-outs recorded." /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b text-xs">
                <th className="pb-2 pr-4">Item</th><th className="pb-2 pr-4">Size</th><th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">By</th><th className="pb-2 pr-4">Notes</th><th className="pb-2">Date</th>
              </tr></thead>
              <tbody>
                {throwOuts.map(r => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium">{r.item_name}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.size_label}</td>
                    <td className="py-2 pr-4 text-red-600 font-medium">{r.quantity}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.performed_by || '—'}</td>
                    <td className="py-2 pr-4 text-slate-400 text-xs">{r.notes || '—'}</td>
                    <td className="py-2 text-slate-400 text-xs">{format(new Date(r.date), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Expiring' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Expiring Stock</h2>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {[7, 14, 30].map(d => (
                <button key={d} onClick={() => setExpiryDays(d)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${expiryDays === d ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {expiring.length === 0 ? <Empty msg="Nothing expiring in this window." /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b text-xs">
                <th className="pb-2 pr-4">Item</th><th className="pb-2 pr-4">Size</th>
                <th className="pb-2 pr-4">Qty</th><th className="pb-2 pr-4">Expires</th><th className="pb-2">Days Left</th>
              </tr></thead>
              <tbody>
                {expiring.map(r => (
                  <tr key={r.batch_id} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium">{r.item_name}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.size_label}</td>
                    <td className="py-2 pr-4">{r.quantity_remaining}</td>
                    <td className="py-2 pr-4">{r.expiration_date}</td>
                    <td className={`py-2 font-bold ${r.days_until_expiry <= 0 ? 'text-red-600' : r.days_until_expiry <= 3 ? 'text-orange-600' : 'text-yellow-600'}`}>
                      {r.days_until_expiry <= 0 ? 'EXPIRED' : `${r.days_until_expiry}d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function Empty({ msg = 'No data for this period.' }) {
  return <div className="text-center py-12 text-slate-400">{msg}</div>
}
