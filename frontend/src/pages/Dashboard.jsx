import { useEffect, useState } from 'react'
import { getCurrentStock, getLowStock, getTransactions, getTopUsed, getExpiringReport } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

export default function Dashboard() {
  const [stock, setStock] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [recent, setRecent] = useState([])
  const [topUsed, setTopUsed] = useState([])
  const [expiring, setExpiring] = useState([])

  useEffect(() => {
    getCurrentStock().then(setStock)
    getLowStock().then(setLowStock)
    getTransactions({ limit: 10 }).then(setRecent)
    getTopUsed({ days: 7, n: 5 }).then(setTopUsed)
    getExpiringReport({ days: 14 }).then(setExpiring)
  }, [])

  const totalItems = new Set(stock.map(s => s.item_id)).size
  const inStock = stock.filter(s => s.total_remaining > 0).length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Items" value={totalItems} color="blue" />
        <Card label="Low Stock" value={lowStock.length} color="red" />
        <Card label="Expiring Soon" value={expiring.length} color="yellow" />
        <Card label="Sizes In Stock" value={inStock} color="green" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {lowStock.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-4">
            <h2 className="font-semibold text-red-700 mb-3">Low Stock</h2>
            <ul className="space-y-1">
              {lowStock.map(item => (
                <li key={`${item.item_id}-${item.item_size_id}`} className="flex justify-between text-sm">
                  <span className="text-slate-700">{item.item_name} <span className="text-slate-400">({item.size_label})</span></span>
                  <span className="font-bold text-red-600">{item.total_remaining} left</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {expiring.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-yellow-100 p-4">
            <h2 className="font-semibold text-yellow-700 mb-3">Expiring Within 14 Days</h2>
            <ul className="space-y-1">
              {expiring.map(item => (
                <li key={item.batch_id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{item.item_name}</span>
                  <span className={`font-medium ${item.days_until_expiry <= 3 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {item.days_until_expiry <= 0 ? 'EXPIRED' : `${item.days_until_expiry}d`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {topUsed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800 mb-4">Top Used This Week</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topUsed}>
              <XAxis dataKey="item_name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total_used" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-800 mb-3">Recent Transactions</h2>
        {recent.length === 0 ? (
          <p className="text-slate-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Item</th>
                  <th className="pb-2 pr-4">Qty</th>
                  <th className="pb-2 pr-4">By</th>
                  <th className="pb-2">When</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(tx => (
                  <tr key={tx.id} className="border-b border-slate-50">
                    <td className="py-1.5 pr-4">
                      <TypeBadge type={tx.transaction_type} />
                    </td>
                    <td className="py-1.5 pr-4 text-slate-800">{tx.item?.name}</td>
                    <td className="py-1.5 pr-4 font-medium">{tx.quantity}</td>
                    <td className="py-1.5 pr-4 text-slate-500">{tx.performed_by || '—'}</td>
                    <td className="py-1.5 text-slate-400 text-xs">{format(new Date(tx.created_at), 'MMM d h:mma')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    green: 'bg-green-50 text-green-700 border-green-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 font-medium opacity-80">{label}</div>
    </div>
  )
}

function TypeBadge({ type }) {
  const styles = {
    scan_in: 'bg-green-100 text-green-700',
    scan_out: 'bg-blue-100 text-blue-700',
    throw_out: 'bg-red-100 text-red-700',
  }
  const labels = { scan_in: 'In', scan_out: 'Out', throw_out: 'Toss' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || ''}`}>{labels[type] || type}</span>
}
