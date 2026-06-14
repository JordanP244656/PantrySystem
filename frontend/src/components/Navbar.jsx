import { NavLink } from 'react-router-dom'

const links = [
  { to: '/scan-out', label: '📤', full: 'Scan Out' },
  { to: '/stock', label: '🛒', full: 'Stock' },
  { to: '/inventory', label: '📦', full: 'Inventory' },
  { to: '/reports', label: '📊', full: 'Reports' },
]

export default function Navbar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-20 bg-[#0f0f0f] border-r border-white/[0.06] z-40 flex flex-col items-center py-3 gap-1">
      <div className="text-xl mb-2">🥫</div>
      {links.map(({ to, label, full }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `w-16 flex flex-col items-center justify-center py-3 rounded-2xl font-medium transition-all text-center ${isActive ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/10'}`
          }>
          <span className="text-2xl leading-none">{label}</span>
          <span className="text-[10px] mt-1 leading-tight">{full}</span>
        </NavLink>
      ))}
    </aside>
  )
}
