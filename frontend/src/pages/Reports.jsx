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
  const COLORS = ['#fff','#a3a3a3','#737373','#525252','#d4d4d4','#e5e5e5','#404040','#fafafa']

  return (
    <div className="max-w-lg mx-auto px-3 pt-5 pb-28 space-y-4">
      <div className="flex gap-1 p-1 bg-white/[0.06] rounded-2xl">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab !== 'Email' && (
        <div className="flex gap-1 p-1 bg-white/[0.06] rounded-2xl">
          {DAY_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-all ${days === d ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
              {d}d
            </button>
          ))}
        </div>
      )}

      {tab === 'Usage' && (
        <div className="card p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Usage — last {days} days</p>
          {chartData.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#ffffff40' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#ffffff40' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                  {itemNames.slice(0, 8).map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 divide-y divide-white/[0.04]">
                {usageData.map((r, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm">
                    <span className="text-white/70">{r.item_name}</span>
                    <div className="flex gap-4">
                      <span className="text-white/30 text-xs">{r.date}</span>
                      <span className="text-white font-medium">×{r.quantity_used}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'Top Used' && (
        <div className="card p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Top 10 — last {days} days</p>
          {topUsed.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topUsed} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#ffffff40' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="item_name" type="category" tick={{ fontSize: 11, fill: '#ffffffb0' }} width={110} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #ffffff15', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                <Bar dataKey="total_used" fill="#ffffff" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {tab === 'Throw Outs' && (
        <div className="card p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Throw Outs — last {days} days</p>
          {throwOuts.length === 0 ? <Empty msg="No throw-outs recorded." /> : (
            <div className="divide-y divide-white/[0.04]">
              {throwOuts.map(r => (
                <div key={r.id} className="flex justify-between py-2.5 text-sm">
                  <span className="text-white/80 font-medium">{r.item_name}</span>
                  <div className="flex gap-4 items-center">
                    <span className="text-white/30 text-xs">{format(new Date(r.date), 'MMM d')}</span>
                    <span className="text-red-400 font-bold">×{r.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Email' && <EmailSettings />}
    </div>
  )
}

function EmailSettings() {
  const [form, setForm] = useState({ enabled: false, to_email: '', from_email: 'pantryupdates@playsbot.cc' })
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
    <div className="card p-5 space-y-5">
      <div>
        <h2 className="font-bold text-white text-lg">Email Notifications</h2>
        <p className="text-white/30 text-sm mt-1">Weekly low stock every Monday. Auto-email after stocking 10+ items.</p>
      </div>

      <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
        className={`relative w-12 h-6 rounded-full transition-colors ${form.enabled ? 'bg-white' : 'bg-white/20'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all ${form.enabled ? 'bg-black left-6' : 'bg-white/60 left-0.5'}`} />
      </button>

      <div className="space-y-3">
        <input type="email" value={form.to_email} onChange={e => setForm(f => ({ ...f, to_email: e.target.value }))}
          placeholder="Send reports to (your email)" className="input" />
        <input type="email" value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))}
          className="input" />
        <p className="text-white/20 text-xs">Requires RESEND_API_KEY in backend/.env</p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button onClick={save} disabled={loading} className="btn-primary py-3 disabled:opacity-40">
          {saved ? '✓ Saved' : 'Save'}
        </button>
        <button onClick={doTest} className="btn-secondary py-3">Send Test Email</button>
        <button onClick={doWeekly} className="btn-secondary py-3">Send Weekly Now</button>
      </div>

      {testStatus && <p className={`text-sm font-medium ${testStatus.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{testStatus}</p>}
      {weeklyStatus && <p className={`text-sm font-medium ${weeklyStatus.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{weeklyStatus}</p>}
    </div>
  )
}

function Empty({ msg = 'No data for this period.' }) {
  return <div className="text-center py-12 text-white/20">{msg}</div>
}
