import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Clients from './pages/Clients';
import Advisor from './pages/Advisor';
import IncomeStatement from './pages/IncomeStatement';
import SalesHistory from './pages/SalesHistory';
import ProductAnalysis from './pages/ProductAnalysis';
import SyncCenter from './pages/SyncCenter';
import { StoreProvider } from './context/StoreContext';
import { Menu, Home, ShoppingCart, Package, TrendingUp, BarChart3 } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/pos', icon: ShoppingCart, label: 'Venta' },
    { path: '/inventory', icon: Package, label: 'Stock' },
    { path: '/analysis', icon: TrendingUp, label: 'Análisis' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-2 z-[100] md:hidden shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path} 
          className={`flex flex-col items-center p-2 transition-all ${isActive(item.path) ? 'text-[#6B7A3A] scale-110' : 'text-gray-400'}`}
        >
          <item.icon size={24} strokeWidth={isActive(item.path) ? 3 : 2} />
          <span className="text-[10px] font-black uppercase tracking-tighter mt-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white overflow-hidden text-[#1C1C1C]">
      {/* Sidebar para PC */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Móvil */}
        <header className="bg-white border-b p-4 flex justify-between items-center md:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[#1C1C1C]">
              <Menu size={24} />
            </button>
            <span className="font-black text-xl tracking-tighter uppercase italic text-[#1C1C1C]">La Tostadora</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#6B7A3A]/10 border border-[#6B7A3A]/20 flex items-center justify-center">
             <BarChart3 size={16} className="text-[#6B7A3A]" />
          </div>
        </header>

        {/* Área de Contenido Principal */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-white">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Barra Inferior Móvil */}
        <BottomNav />
      </div>
    </div>
  );
};

const App = () => {
  return (
    <StoreProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/financials" element={<IncomeStatement />} />
            <Route path="/analysis" element={<ProductAnalysis />} />
            <Route path="/advisor" element={<Advisor />} />
            <Route path="/sync" element={<SyncCenter />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
};

export default App;
