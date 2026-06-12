import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import ScanOut from './pages/ScanOut'
import MassStockIn from './pages/MassStockIn'
import Stores from './pages/Stores'
import Reports from './pages/Reports'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/scan-out" element={<ScanOut />} />
            <Route path="/mass-stock" element={<MassStockIn />} />
            <Route path="/stores" element={<Stores />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
