import { NavLink } from 'react-router-dom'

const links = [
  { to: '/scan-out', label: '📤', full: 'Scan Out' },
  { to: '/stock', label: '🛒', full: 'Stock' },
  { to: '/reports', label: '📊', full: 'Reports' },
]

export default function Navbar() {
  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:block bg-gradient-to-r from-green-800 to-green-700 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 flex items-center h-16 gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥫</span>
            <div>
              <div className="font-bold text-white leading-tight">Pollack Family Pantry</div>
              <div className="text-green-300 text-xs">Inventory System</div>
            </div>
          </div>
          <div className="flex gap-1 ml-4">
            {links.map(({ to, full }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-white text-green-800' : 'text-green-100 hover:bg-green-600'}`
                }>
                {full}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile top */}
      <nav className="md:hidden bg-gradient-to-r from-green-800 to-green-700 text-white px-4 h-14 flex items-center gap-2 shadow">
        <span className="text-xl">🥫</span>
        <div>
          <div className="font-bold text-sm leading-tight">Pollack Family Pantry</div>
          <div className="text-green-300 text-xs">Inventory System</div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex shadow-lg">
        {links.map(({ to, label, full }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-semibold transition-colors ${isActive ? 'text-green-700' : 'text-slate-400'}`
            }>
            <span className="text-xl leading-none mb-0.5">{label}</span>
            <span>{full}</span>
          </NavLink>
        ))}
      </div>
    </>
  )
}
