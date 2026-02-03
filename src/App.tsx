import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import { Menu } from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b p-4 flex items-center md:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600">
            <Menu size={24} />
          </button>
          <span className="ml-4 font-bold text-coffee-800">La Tostadora</span>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          {children}
        </main>
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
