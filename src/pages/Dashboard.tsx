import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, Target, Users, Package, AlertTriangle, 
  Coffee, ChevronRight, ArrowUpRight, Calendar, 
  DollarSign, Info, UserX, ShoppingBag, X, Check, Edit3
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { 
    sales, products, clients, consumptions, 
    monthlyGoal, stockThreshold, updateGlobalSettings, isLoading 
  } = useStore();

  // ESTADOS
  const [activeView, setActiveView] = useState<'none' | 'sold' | 'consumed' | 'lowStock' | 'dormant'>('none');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(monthlyGoal);
  const [tempThreshold, setTempThreshold] = useState(stockThreshold);

  // Sincronizar configuraciones locales con el contexto
  useEffect(() => {
    setTempGoal(monthlyGoal);
    setTempThreshold(stockThreshold);
  }, [monthlyGoal, stockThreshold]);

  // --- 1. FILTRADO DE DATOS ---
  const filteredData = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0];
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];

    const filterByRange = (list: any[]) => list.filter(item => {
      const itemDate = item.date.split('T')[0];
      const matchesStart = dateRange.start ? itemDate >= dateRange.start : true;
      const matchesEnd = dateRange.end ? itemDate <= dateRange.end : true;
      return matchesStart && matchesEnd;
    });

    const fSales = filterByRange(sales);
    const fConsumptions = filterByRange(consumptions);

    return {
      sales: fSales,
      consumptions: fConsumptions,
      currentMonthRev: sales.filter(s => s.date.split('T')[0] >= startOfMonth).reduce((acc, s) => acc + s.total, 0),
      last3MonthsRev: sales.filter(s => s.date.split('T')[0] >= threeMonthsAgo).reduce((acc, s) => acc + s.total, 0),
      currentYearRev: sales.filter(s => s.date.split('T')[0] >= startOfYear).reduce((acc, s) => acc + s.total, 0),
      allTimeRev: sales.reduce((acc, s) => acc + s.total, 0),
      totalFilteredRev: fSales.reduce((acc, s) => acc + s.total, 0)
    };
  }, [sales, consumptions, dateRange]);

  // --- 2. ANÁLISIS DE UNIDADES Y RENTABILIDAD ---
  const analysis = useMemo(() => {
    const soldItems: Record<string, any> = {};
    const consumedItems: Record<string, any> = {};
    let totalProfit = 0;
    let unitsSold = 0;
    let unitsConsumed = 0;

    filteredData.sales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        unitsSold += item.quantity;
        const prod = products.find(p => p.id === item.id || p.id === item.product_id);
        const cost = prod ? prod.costPrice : 0;
        const profit = (item.appliedPrice - cost) * item.quantity;
        totalProfit += profit;

        const id = item.id || item.product_id;
        if (!soldItems[id]) soldItems[id] = { name: item.name, qty: 0, profit: 0 };
        soldItems[id].qty += item.quantity;
        soldItems[id].profit += profit;
      });
    });

    filteredData.consumptions.forEach(c => {
      unitsConsumed += c.quantity;
      const id = c.productId || c.product_id;
      if (!consumedItems[id]) consumedItems[id] = { name: c.productName || c.name, qty: 0 };
      consumedItems[id].qty += c.quantity;
    });

    return { unitsSold, unitsConsumed, totalProfit, soldItems, consumedItems };
  }, [filteredData, products]);

  // --- 3. CLIENTES DORMIDOS Y STOCK ---
  const dormantClients = useMemo(() => {
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    
    return clients.filter(client => {
      const clientSales = sales.filter(s => s.clientId === client.id);
      if (clientSales.length === 0) return true;
      const lastSaleDate = new Date(Math.max(...clientSales.map(s => new Date(s.date).getTime())));
      return lastSaleDate < fortyFiveDaysAgo;
    });
  }, [clients, sales]);

  const lowStockProducts = products.filter(p => p.stock <= stockThreshold);

  // --- 4. TOP RANKINGS ---
  const topVarieties = Object.values(analysis.soldItems)
    .sort((a: any, b: any) => b.qty - a.qty)
    .slice(0, 5);

  const topClients = clients.map(c => {
    const cSales = sales.filter(s => s.clientId === c.id);
    const spent = cSales.reduce((acc, s) => acc + s.total, 0);
    const varietyCounts: any = {};
    cSales.forEach(s => s.items?.forEach((i: any) => varietyCounts[i.name] = (varietyCounts[i.name] || 0) + i.quantity));
    const fav = Object.entries(varietyCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '---';
    return { ...c, spent, fav };
  }).sort((a, b) => b.spent - a.spent).slice(0, 5);

  // --- ACCIONES ---
  const handleUpdateSettings = async () => {
    await updateGlobalSettings(tempGoal, tempThreshold);
    setIsEditingGoal(false);
  };

  if (isLoading) return <div className="p-20 text-center font-black animate-pulse">CARGANDO DATOS...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen pb-32 text-[#1C1C1C]">
      
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <h2 className="text-4xl font-black uppercase italic tracking-tighter">La Tostadora <span className="text-[#6B7A3A]">Dashboard</span></h2>
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-3xl border-2 border-gray-100">
          <Calendar size={18} className="ml-2 text-gray-400" />
          <input type="date" className="bg-transparent font-bold text-xs p-2 outline-none" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
          <span className="text-gray-300">/</span>
          <input type="date" className="bg-transparent font-bold text-xs p-2 outline-none" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          {(dateRange.start || dateRange.end) && (
            <button onClick={() => setDateRange({start: '', end: ''})} className="p-2 text-red-500"><X size={16}/></button>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Mes Actual', value: filteredData.currentMonthRev, icon: <Coffee /> },
          { label: '3 Meses', value: filteredData.last3MonthsRev, icon: <TrendingUp /> },
          { label: 'Año actual', value: filteredData.currentYearRev, icon: <ShoppingBag /> },
          { label: 'Histórico', value: filteredData.allTimeRev, icon: <DollarSign /> },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">{kpi.label}</p>
            <p className="text-2xl font-black">${kpi.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* OBJETIVO Y STOCK CONFIG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1C1C1C] p-8 rounded-[3rem] text-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#6B7A3A]">Objetivo Mensual</h3>
            <button onClick={() => setIsEditingGoal(!isEditingGoal)} className="p-2 hover:bg-white/10 rounded-full"><Edit3 size={16}/></button>
          </div>
          {isEditingGoal ? (
            <div className="flex gap-4 mb-4">
              <input type="number" className="bg-white/10 border border-[#6B7A3A] p-2 rounded-xl text-white font-black" value={tempGoal} onChange={e => setTempGoal(Number(e.target.value))} />
              <button onClick={handleUpdateSettings} className="bg-[#6B7A3A] p-2 rounded-xl"><Check size={20}/></button>
            </div>
          ) : (
            <p className="text-4xl font-black italic mb-4">${filteredData.currentMonthRev.toLocaleString()} <span className="text-lg text-gray-500 font-normal">/ ${monthlyGoal.toLocaleString()}</span></p>
          )}
          <div className="h-4 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#6B7A3A] transition-all duration-1000" style={{ width: `${Math.min((filteredData.currentMonthRev/monthlyGoal)*100, 100)}%` }}></div>
          </div>
        </div>

        <div onClick={() => setActiveView(activeView === 'lowStock' ? 'none' : 'lowStock')} className={`p-8 rounded-[3rem] border-2 cursor-pointer transition-all ${lowStockProducts.length > 0 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-4">
            <AlertTriangle className={lowStockProducts.length > 0 ? 'text-red-600' : 'text-gray-300'} />
            {isEditingGoal ? (
              <input type="number" className="w-16 bg-white p-1 rounded-lg text-xs font-black border border-red-200" value={tempThreshold} onChange={e => setTempThreshold(Number(e.target.value))} />
            ) : (
              <span className="text-[10px] font-black uppercase text-gray-400">Umbral: {stockThreshold}u</span>
            )}
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-red-600">Stock Crítico</p>
          <p className="text-5xl font-black">{lowStockProducts.length}</p>
        </div>
      </div>

      {/* VENDIDO VS CONSUMIDO (BOTONES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => setActiveView(activeView === 'sold' ? 'none' : 'sold')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex justify-between items-center hover:shadow-xl transition-all">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unidades Vendidas</p>
            <p className="text-4xl font-black italic">{analysis.unitsSold} u.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-[#6B7A3A]">Rentabilidad</p>
            <p className="text-2xl font-black text-[#6B7A3A]">+${analysis.totalProfit.toLocaleString()}</p>
          </div>
        </button>

        <button onClick={() => setActiveView(activeView === 'consumed' ? 'none' : 'consumed')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex justify-between items-center hover:shadow-xl transition-all">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Consumo Propio</p>
            <p className="text-4xl font-black italic">{analysis.unitsConsumed} u.</p>
          </div>
          <Info className="text-amber-500" size={32} />
        </button>
      </div>

      {/* PANEL INTERACTIVO DE DETALLES */}
      {activeView !== 'none' && (
        <div className="bg-gray-50 p-8 rounded-[3rem] border-2 border-[#6B7A3A]/20 animate-slide-up">
          <div className="flex justify-between mb-6">
            <h3 className="font-black uppercase italic">{activeView === 'sold' ? 'Detalle de Rentabilidad' : activeView === 'consumed' ? 'Detalle de Consumos' : activeView === 'lowStock' ? 'Variedades a Reponer' : 'Clientes Ausentes'}</h3>
            <button onClick={() => setActiveView('none')}><X /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeView === 'sold' && Object.values(analysis.soldItems).map((p: any, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div><p className="font-black text-sm uppercase">{p.name}</p><p className="text-[10px] text-gray-400 font-bold">{p.qty} unidades</p></div>
                <p className="font-black text-[#6B7A3A]">+${p.profit.toLocaleString()}</p>
              </div>
            ))}
            {activeView === 'consumed' && Object.values(analysis.consumedItems).map((p: any, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <p className="font-black text-sm uppercase">{p.name}</p>
                <p className="font-black text-amber-600">{p.qty} u.</p>
              </div>
            ))}
            {activeView === 'lowStock' && lowStockProducts.map((p, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center border border-red-100">
                <p className="font-black text-sm uppercase">{p.name}</p>
                <p className="font-black text-red-600">{p.stock} u.</p>
              </div>
            ))}
            {activeView === 'dormant' && dormantClients.map((c, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="font-black text-sm uppercase">{c.name}</p>
                <p className="text-[9px] font-bold text-red-500 uppercase">Sin compras hace +45 días</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Users size={16}/> Top 5 Clientes</h3>
            <button onClick={() => setActiveView('dormant')} className="text-[9px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-full">{dormantClients.length} Inactivos</button>
          </div>
          <div className="space-y-3">
            {topClients.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-[#1C1C1C] text-white rounded-full flex items-center justify-center text-[10px] font-black">{i+1}</span>
                  <div><p className="font-black text-xs uppercase">{c.name}</p><p className="text-[8px] font-bold text-[#6B7A3A] uppercase">Prefiere: {c.fav}</p></div>
                </div>
                <p className="font-black text-sm">${c.spent.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100">
          <h3 className="text-xs font-black uppercase tracking-widest mb-6">Top 5 Variedades</h3>
          <div className="space-y-3">
            {topVarieties.map((p: any, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-[#6B7A3A] text-white rounded-lg flex items-center justify-center text-[10px] font-black">{p.qty}</span>
                  <p className="font-black text-xs uppercase">{p.name}</p>
                </div>
                <p className="font-black text-sm text-[#6B7A3A]">+${p.profit.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
