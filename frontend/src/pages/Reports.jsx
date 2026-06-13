import { useState, useEffect } from 'react'
import { getUsageReport, getThrowOutReport, getTopUsed, getEmailSettings, saveEmailSettings, testEmail, sendWeeklyNow } from '../api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'

const TABS = ['Usage', 'Top Used', 'Throw Outs', 'Email']
const DAY_OPTIONS = [7, 14, 30, 90]

export default function Reports() {
  const [tab, setTab] = useState('Usage')
  const [days, setDays] = useState(30)
  const [usageData, setUsageData] = useState([])
  const [topUsed, setTopUsed] = useState([])
  const [throwOuts, setThrowOuts] = useState([])

  useEffect(() => {
    getUsageReport({ days }).then(setUsageData)
    getTopUsed({ days, n: 10 }).then(setTopUsed)
    getThrowOutReport({ days }).then(setThrowOuts)
  }, [days])

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
        {tab !== 'Email' && (
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
                <th className="pb-2 pr-4">Item</th><th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">By</th><th className="pb-2">Date</th>
              </tr></thead>
              <tbody>
                {throwOuts.map(r => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-medium">{r.item_name}</td>
                    <td className="py-2 pr-4 text-red-600 font-medium">{r.quantity}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.performed_by || '—'}</td>
                    <td className="py-2 text-slate-400 text-xs">{format(new Date(r.date), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'Email' && <EmailSettings />}
    </div>
  )
}

function EmailSettings() {
  const [form, setForm] = useState({ enabled: false, to_email: '', smtp_user: '', smtp_password: '' })
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState(null)
  const [weeklyStatus, setWeeklyStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getEmailSettings().then(s => setForm(f => ({ ...f, ...s })))
  }, [])

  const save = async () => {
    setLoading(true)
    await saveEmailSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setLoading(false)
  }

  const doTest = async () => {
    setTestStatus('sending...')
    const r = await testEmail()
    setTestStatus(r.ok ? '✓ Sent! Check your inbox.' : `✗ ${r.message}`)
  }

  const doWeekly = async () => {
    setWeeklyStatus('sending...')
    const r = await sendWeeklyNow()
    setWeeklyStatus(r.ok ? '✓ Weekly report sent!' : `✗ ${r.message}`)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-lg space-y-5">
      <div>
        <h2 className="font-bold text-slate-800 text-lg">Email Notifications</h2>
        <p className="text-slate-500 text-sm mt-1">Weekly low stock report every Monday. Email after any stock load of 10+ items.</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
          className={`w-12 h-6 rounded-full transition-colors ${form.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.enabled ? 'translate-x-6' : ''}`} />
        </button>
        <span className="font-medium text-slate-700">{form.enabled ? 'Enabled' : 'Disabled'}</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Send reports to</label>
          <input type="email" value={form.to_email} onChange={e => setForm(f => ({ ...f, to_email: e.target.value }))}
            placeholder="you@email.com"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gmail address (sends from)</label>
          <input type="email" value={form.smtp_user} onChange={e => setForm(f => ({ ...f, smtp_user: e.target.value }))}
            placeholder="yourgmail@gmail.com"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gmail App Password</label>
          <input type="password" value={form.smtp_password} onChange={e => setForm(f => ({ ...f, smtp_password: e.target.value }))}
            placeholder="xxxx xxxx xxxx xxxx"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-slate-400 mt-1">Need an App Password? Go to Google Account → Security → 2-Step Verification → App Passwords</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={save} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
        <button onClick={doTest} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
          Send Test Email
        </button>
        <button onClick={doWeekly} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
          Send Weekly Now
        </button>
      </div>

      {testStatus && <p className={`text-sm font-medium ${testStatus.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{testStatus}</p>}
      {weeklyStatus && <p className={`text-sm font-medium ${weeklyStatus.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{weeklyStatus}</p>}
    </div>
  )
}

function Empty({ msg = 'No data for this period.' }) {
  return <div className="text-center py-12 text-slate-400">{msg}</div>
}
