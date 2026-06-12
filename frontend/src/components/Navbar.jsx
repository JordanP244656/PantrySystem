import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '🏠', full: 'Dashboard' },
  { to: '/inventory', label: '📦', full: 'Inventory' },
  { to: '/scan-out', label: '📤', full: 'Scan Out' },
  { to: '/mass-stock', label: '🛒', full: 'Mass Stock' },
  { to: '/stores', label: '🏪', full: 'Stores' },
  { to: '/reports', label: '📊', full: 'Reports' },
]

export default function Navbar() {
  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:block bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-8">
          <span className="font-bold text-lg tracking-tight text-blue-400">PantrySystem</span>
          <div className="flex gap-1">
            {links.map(({ to, full }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`
                }>
                {full}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav className="md:hidden bg-slate-800 text-white px-4 h-12 flex items-center">
        <span className="font-bold text-blue-400">PantrySystem</span>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex">
        {links.map(({ to, label, full }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500'}`
            }>
            <span className="text-xl leading-none">{label}</span>
            <span className="mt-0.5">{full}</span>
          </NavLink>
        ))}
      </div>
    </>
  )
}
