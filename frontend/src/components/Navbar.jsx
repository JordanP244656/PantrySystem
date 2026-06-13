import { NavLink } from 'react-router-dom'

const links = [
  { to: '/scan-out', label: '📤', full: 'Scan Out' },
  { to: '/stock', label: '🛒', full: 'Stock' },
  { to: '/inventory', label: '📦', full: 'Inventory' },
  { to: '/reports', label: '📊', full: 'Reports' },
]

export default function Navbar() {
  return (
    <>
      <nav className="hidden md:block bg-[#0a0a0a] border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-6 flex items-center h-14 gap-6">
          <span className="font-bold text-white tracking-tight">🥫 Pollack Family Pantry</span>
          <div className="flex gap-1 ml-2">
            {links.map(({ to, full }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-white text-black' : 'text-white/50 hover:text-white hover:bg-white/10'}`
                }>
                {full}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <nav className="md:hidden bg-[#0a0a0a] border-b border-white/[0.06] px-4 h-12 flex items-center">
        <span className="font-bold text-white text-sm">🥫 Pollack Family Pantry</span>
      </nav>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-white/[0.06] z-40 flex">
        {links.map(({ to, label, full }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 text-xs font-medium transition-all ${isActive ? 'text-white' : 'text-white/30'}`
            }>
            <span className="text-lg leading-none mb-0.5">{label}</span>
            <span>{full}</span>
          </NavLink>
        ))}
      </div>
    </>
  )
}
