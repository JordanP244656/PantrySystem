import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ScanOut from './pages/ScanOut'
import MassStockIn from './pages/MassStockIn'
import Reports from './pages/Reports'
import Inventory from './pages/Inventory'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0a0a0a] flex">
        <Navbar />
        <main className="flex-1 ml-24 p-4 h-screen overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/scan-out" replace />} />
            <Route path="/scan-out" element={<ScanOut />} />
            <Route path="/stock" element={<MassStockIn />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
