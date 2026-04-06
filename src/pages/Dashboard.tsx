import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, Target, Users, Package, AlertTriangle, 
  Coffee, ChevronRight, ArrowUpRight, Calendar, 
  Filter, DollarSign, Info, UserX, ShoppingBag, ArrowDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';

const Dashboard = () => {
  const { 
    sales, products, clients, consumptions, 
    monthlyGoal, stockThreshold, updateGlobalSettings, isLoading 
  } = useStore();

  // ESTADOS PARA INTERACTIVIDAD
  const [activeView, setActiveView] = useState<'none' | 'sold' | 'consumed' | 'lowStock' | 'dormant'>('none');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState({ goal: monthlyGoal, threshold: stockThreshold });

  // --- LÓGICA DE FILTRADO Y TIEMPOS ---
  const now = new Date();
  
  const getTotals = (filteredSales: any[]) => filteredSales.reduce((acc, s) => acc + s.total, 0);

  const metrics = useMemo(() => {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const fSales = sales.filter(s => {
      const d = new Date(s.date);
      const matchesStart = dateRange.start ? d >= new Date(dateRange.start) : true;
      const matchesEnd = dateRange.end ? d <= new Date(dateRange.end) : true;
      return matchesStart && matchesEnd;
    });

    return {
      currentMonth: getTotals(sales.filter(s => new Date(s.date) >= startOfMonth)),
      last3Months: getTotals(sales.filter(s => new Date(s.date) >= threeMonthsAgo)),
      currentYear: getTotals(sales.filter(s => new Date(s.date) >= startOfYear)),
      allTime: getTotals(sales),
      filtered: getTotals(fSales),
      filteredSales: fSales
    };
  }, [sales, dateRange]);

  // --- RENTABILIDAD Y UNIDADES ---
  const analysis = useMemo(() => {
    const soldBreakdown: Record<string, any> = {};
    const consumedBreakdown: Record<string, any> = {};
    let totalUnitsSold = 0;
    let totalUnitsConsumed = 0;
    let totalProfit = 0;

    // Ventas
    metrics.filteredSales.forEach(s => {
      s.items.forEach((item: any) => {
        totalUnitsSold += item.quantity;
        const prod = products.find(p => p.id === item.id);
        const cost = prod ? prod.costPrice : 0;
        const profit = (item.appliedPrice - cost) * item.quantity;
        totalProfit += profit;

        if (!soldBreakdown[item.id]) soldBreakdown[item.id] = { name: item.name, qty: 0, profit: 0 };
        soldBreakdown[item.id].qty += item.quantity;
        soldBreakdown[item.id].profit += profit;
      });
    });

    // Consumos
    consumptions.forEach(c => {
      totalUnitsConsumed += c.quantity;
      if (!consumedBreakdown[c.productId]) consumedBreakdown[c.productId] = { name: c.productName, qty: 0 };
      consumedBreakdown[c.productId].qty += c.quantity;
    });

    return { totalUnitsSold, totalUnitsConsumed, totalProfit, soldBreakdown, consumedBreakdown };
  }, [metrics.filteredSales, consumptions, products]);

  // --- CLIENTES DORMIDOS (> 45 DÍAS) ---
  const dormantClients = useMemo(() => {
    return clients.filter(client => {
      const clientSales = sales.filter(s => s.clientId === client.id);
      if (clientSales.length === 0) return true;
      const lastSale = new Date(Math.max(...clientSales.map(s => new Date(s.date).getTime())));
      const diffDays = Math.floor((now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 45;
    });
  }, [clients, sales]);

  // --- TOP RANKINGS ---
  const topClients = useMemo(() => {
    return clients.map(c => {
      const cSales = sales.filter(s => s.clientId === c.id);
      const total = cSales.reduce((acc, s) => acc + s.total, 0);
      const varieties: Record<string, number> = {};
      cSales.forEach(s => s.items.forEach((i: any) => {
        varieties[i.name] = (varieties[i.name] || 0) + i.quantity;
      }));
      const fav = Object.entries(varieties).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';
      return { ...c, totalSpent: total, favorite: fav };
    }).sort((a,b) => b.totalSpent - a.totalSpent).slice(0, 5);
  }, [clients, sales]);

  // --- GRÁFICO COMPARATIVO ANUAL ---
  const comparisonData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((m, i) => {
      const currentYearSales = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === i && d.getFullYear() === now.getFullYear();
      }).reduce((acc, s) => acc + s.total, 0);

      const lastYearSales = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === i && d.getFullYear() === now.getFullYear() - 1;
      }).reduce((acc, s) => acc + s.total, 0);

      return { name: m, actual: currentYearSales, anterior: lastYearSales };
    });
  }, [sales]);

  const handleSaveSettings = () => {
    updateGlobalSettings(tempSettings.goal, tempSettings.threshold);
    setIsEditingSettings(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen pb-32 text-[#1C1C1C]">
      
      {/* 1. HEADER & FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Dashboard</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6B7A3A] mt-2">La Tostadora v3.0</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-gray-50 p-3 rounded-[2.5rem] border-2 border-gray-100 shadow-sm w-full lg:w-auto">
          <div className="flex items-center gap-2 px-4">
            <Calendar size={16} className="text-gray-400" />
            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-[10px] font-black outline-none uppercase" />
            <span className="text-gray-300">/</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-[10px] font-black outline-none uppercase" />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button onClick={() => setDateRange({start:'', end:''})} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-all"><X size={14}/></button>
          )}
        </div>
      </div>

      {/* 2. RECUADROS DE VENTAS (4 PERIODOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Mes Actual', value: metrics.currentMonth, icon: <Coffee size={20}/> },
          { label: 'Últimos 3 Meses', value: metrics.last3Months, icon: <TrendingUp size={20}/> },
          { label: 'Año actual', value: metrics.currentYear, icon: <ShoppingBag size={20}/> },
          { label: 'Total Histórico', value: metrics.allTime, icon: <DollarSign size={20}/> }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm hover:border-[#6B7A3A] transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-[#6B7A3A] group-hover:text-white transition-all">{item.icon}</div>
              <ArrowUpRight size={16} className="text-[#6B7A3A]" />
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{item.label}</p>
            <p className="text-3xl font-black tracking-tighter mt-1">${item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* 3. OBJETIVO Y ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Barra de Objetivos */}
        <div className="lg:col-span-2 bg-[#1C1C1C] p-8 rounded-[3rem] text-white relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#6B7A3A]">Objetivo de Venta Mensual</h3>
            <button onClick={() => setIsEditingSettings(!isEditingSettings)} className="text-[10px] font-black uppercase bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-all">Configurar</button>
          </div>
          
          {isEditingSettings ? (
            <div className="flex items-center gap-4 mb-6 animate-fade-in">
              <input type="number" value={tempSettings.goal} onChange={e => setTempSettings({...tempSettings, goal: Number(e.target.value)})} className="bg-white/10 border-2 border-[#6B7A3A] p-3 rounded-2xl text-xl font-black w-40 outline-none" />
              <button onClick={handleSaveSettings} className="bg-[#6B7A3A] text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">Guardar</button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-black italic tracking-tighter">${metrics.currentMonth.toLocaleString()}</span>
              <span className="text-gray-500 font-bold">/ ${monthlyGoal.toLocaleString()}</span>
            </div>
          )}

          <div className="relative h-6 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div 
              className="absolute top-0 left-0 h-full bg-[#6B7A3A] transition-all duration-1000 flex items-center justify-end pr-2 shadow-[0_0_20px_rgba(107,122,58,0.5)]" 
              style={{ width: `${Math.min((metrics.currentMonth/monthlyGoal)*100, 100)}%` }}
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <p className="text-[10px] font-black uppercase text-gray-500 mt-4 tracking-widest">Progreso: {((metrics.currentMonth/monthlyGoal)*100).toFixed(1)}%</p>
        </div>

        {/* Alerta de Stock Bajo Interactiva */}
        <div 
          onClick={() => setActiveView(activeView === 'lowStock' ? 'none' : 'lowStock')}
          className={`p-8 rounded-[3rem] border-2 cursor-pointer transition-all ${products.filter(p => p.stock <= stockThreshold).length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}
        >
          <div className="flex justify-between items-center mb-6">
            <AlertTriangle className={products.filter(p => p.stock <= stockThreshold).length > 0 ? 'text-red-600 animate-bounce' : 'text-gray-400'} />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Config: {stockThreshold}u</span>
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">Stock Crítico</h3>
          <p className="text-5xl font-black tracking-tighter text-[#1C1C1C]">{products.filter(p => p.stock <= stockThreshold).length}</p>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-black uppercase text-red-600">
            Ver detalles <ChevronRight size={12}/>
          </div>
        </div>
      </div>

      {/* 4. COMPARATIVA VENDIDO VS CONSUMIDO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <button 
          onClick={() => setActiveView(activeView === 'sold' ? 'none' : 'sold')}
          className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex items-center justify-between hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#6B7A3A]/10 text-[#6B7A3A] rounded-[1.5rem] flex items-center justify-center"><ShoppingBag size={32}/></div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unidades Vendidas</p>
              <p className="text-4xl font-black italic tracking-tighter">{analysis.totalUnitsSold} u.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-[#6B7A3A]">Rentabilidad</p>
            <p className="text-2xl font-black tracking-tighter text-[#6B7A3A]">+${analysis.totalProfit.toLocaleString()}</p>
          </div>
        </button>

        <button 
          onClick={() => setActiveView(activeView === 'consumed' ? 'none' : 'consumed')}
          className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex items-center justify-between hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center"><Coffee size={32}/></div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Consumo Propio</p>
              <p className="text-4xl font-black italic tracking-tighter">{analysis.totalUnitsConsumed} u.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest italic">Costo Interno</p>
            <Info size={20} className="text-amber-200 ml-auto" />
          </div>
        </button>
      </div>

      {/* 5. MODALES INTERACTIVOS (DESGLOSES) */}
      {activeView !== 'none' && (
        <div className="bg-gray-50 rounded-[3rem] p-8 border-2 border-[#6B7A3A]/20 animate-slide-up">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              {activeView === 'sold' && 'Desglose de Ventas y Ganancia'}
              {activeView === 'consumed' && 'Detalle de Consumo Interno'}
              {activeView === 'lowStock' && 'Variedades con Stock Crítico'}
              {activeView === 'dormant' && 'Clientes Ausentes (>45 días)'}
            </h3>
            <button onClick={() => setActiveView('none')} className="p-2 bg-white rounded-full shadow-sm hover:scale-110 transition-all"><X size={20}/></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeView === 'sold' && Object.values(analysis.soldBreakdown).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-black uppercase text-sm">{p.name}</p>
                  <p className="text-[10px] font-bold text-gray-400">{p.qty} unidades</p>
                </div>
                <p className="font-black text-[#6B7A3A] text-lg">+${p.profit.toLocaleString()}</p>
              </div>
            ))}
            {activeView === 'consumed' && Object.values(analysis.consumedBreakdown).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border-2 border-gray-100 flex justify-between items-center">
                <p className="font-black uppercase text-sm">{p.name}</p>
                <p className="font-black text-amber-600 text-lg">{p.qty} u.</p>
              </div>
            ))}
            {activeView === 'lowStock' && products.filter(p => p.stock <= stockThreshold).map((p, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border-2 border-red-100 flex justify-between items-center">
                <p className="font-black uppercase text-sm">{p.name}</p>
                <p className="font-black text-red-600 text-lg">{p.stock} disp.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. RANKINGS (CLIENTES Y VARIEDADES) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clientes */}
        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Users size={16} className="text-[#6B7A3A]"/> Top 5 Clientes</h3>
            <button 
              onClick={() => setActiveView('dormant')}
              className={`text-[9px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 ${dormantClients.length > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}
            >
              <UserX size={12}/> {dormantClients.length} Inactivos
            </button>
          </div>
          <div className="space-y-4">
            {topClients.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1C1C1C] text-white flex items-center justify-center font-black text-xs">{i+1}</div>
                  <div>
                    <p className="font-black uppercase text-xs truncate w-32">{c.name}</p>
                    <p className="text-[9px] font-bold text-[#6B7A3A] uppercase">Prefiere: {c.favorite}</p>
                  </div>
                </div>
                <p className="font-black text-[#1C1C1C]">${c.totalSpent.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Variedades y Rentabilidad */}
        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8"><ShoppingBag size={16} className="text-[#6B7A3A]"/> Top 5 Variedades</h3>
          <div className="space-y-4">
            {Object.values(analysis.soldBreakdown).sort((a,b) => b.qty - a.qty).slice(0, 5).map((p: any, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#6B7A3A] text-white flex items-center justify-center font-black text-xs">{p.qty}</div>
                  <p className="font-black uppercase text-xs truncate w-32">{p.name}</p>
                </div>
                <div className="text-right">
                   <p className="font-black text-[#6B7A3A] text-sm">+${p.profit.toLocaleString()}</p>
                   <p className="text-[8px] font-black uppercase text-gray-400 italic">Neto</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. GRÁFICO COMPARATIVO ANUAL (LÍNEAS) */}
      <div className="bg-[#1C1C1C] p-8 md:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#6B7A3A]/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Comparativo Anual</h3>
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em]">Pesos Argentinos ($)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6B7A3A]"/> <span className="text-[10px] font-black uppercase">{now.getFullYear()}</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white/20"/> <span className="text-[10px] font-black uppercase">{now.getFullYear()-1}</span></div>
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={comparisonData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B7A3A" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6B7A3A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#6B7A3A' }}
                />
                <Area type="monotone" dataKey="actual" stroke="#6B7A3A" strokeWidth={5} fillOpacity={1} fill="url(#colorActual)" />
                <Area type="monotone" dataKey="anterior" stroke="rgba(255,255,255,0.1)" strokeWidth={3} fill="transparent" strokeDasharray="10 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
