import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, Target, Users, Package, AlertTriangle, 
  Coffee, ChevronRight, ArrowUpRight, Calendar, 
  DollarSign, Info, UserX, ShoppingBag, X, Check, Edit3
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const Dashboard = () => {
  const { 
    sales = [], products = [], clients = [], consumptions = [], 
    monthlyGoal, stockThreshold, updateGlobalSettings, isLoading 
  } = useStore();

  const [activeView, setActiveView] = useState<'none' | 'sold' | 'consumed' | 'lowStock' | 'dormant'>('none');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(monthlyGoal);
  const [tempThreshold, setTempThreshold] = useState(stockThreshold);

  useEffect(() => { setTempGoal(monthlyGoal); setTempThreshold(stockThreshold); }, [monthlyGoal, stockThreshold]);

  // --- FILTRADO MAESTRO POR RANGO DE FECHA ---
  const fSales = useMemo(() => {
    return sales.filter(s => {
      const d = s.date?.substring(0, 10);
      return (!dateRange.start || d >= dateRange.start) && (!dateRange.end || d <= dateRange.end);
    });
  }, [sales, dateRange]);

  const fConsumptions = useMemo(() => {
    return consumptions.filter(c => {
      const d = c.date?.substring(0, 10);
      return (!dateRange.start || d >= dateRange.start) && (!dateRange.end || d <= dateRange.end);
    });
  }, [consumptions, dateRange]);

  // --- ANÁLISIS DE PRODUCTOS (SOLUCIÓN DUPLICADOS CATUAI) ---
  const analysis = useMemo(() => {
    const soldMap: Record<string, any> = {};
    const consMap: Record<string, any> = {};
    let totalProfit = 0, uSold = 0, uCons = 0;

    fSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const pId = (item.id || item.product_id || '').toLowerCase();
        if (!pId) return;
        uSold += Number(item.quantity || 0);
        const prod = products.find(p => p.id.toLowerCase() === pId);
        const cost = prod ? (prod.costPrice || 0) : 0;
        const profit = ((item.appliedPrice || 0) - cost) * (item.quantity || 0);
        totalProfit += profit;

        if (!soldMap[pId]) soldMap[pId] = { name: item.name, qty: 0, profit: 0 };
        soldMap[pId].qty += Number(item.quantity || 0);
        soldMap[pId].profit += profit;
      });
    });

    fConsumptions.forEach(c => {
      const pId = (c.productId || c.product_id || '').toLowerCase();
      uCons += Number(c.quantity || 0);
      if (!consMap[pId]) consMap[pId] = { name: c.productName || 'Variedad', qty: 0 };
      consMap[pId].qty += Number(c.quantity || 0);
    });

    return { uSold, uCons, totalProfit, soldMap, consMap };
  }, [fSales, fConsumptions, products]);

  // --- RANKINGS ---
  const topClients = useMemo(() => {
    return clients.map(c => {
      const cSales = sales.filter(s => s.clientId === c.id);
      const spent = cSales.reduce((acc, s) => acc + s.total, 0);
      const varietyCounts: any = {};
      cSales.forEach(s => s.items?.forEach((i: any) => varietyCounts[i.name] = (varietyCounts[i.name] || 0) + i.quantity));
      const fav = Object.entries(varietyCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '---';
      return { ...c, spent, fav };
    }).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }, [clients, sales]);

  const topVarieties = useMemo(() => {
    return Object.values(analysis.soldMap).sort((a: any, b: any) => b.qty - a.qty).slice(0, 5);
  }, [analysis.soldMap]);

  // --- GRÁFICO ANUAL ---
  const chartData = useMemo(() => {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const currentYear = new Date().getFullYear();
    return months.map((m, i) => ({
      name: m,
      actual: sales.filter(s => new Date(s.date).getMonth() === i && new Date(s.date).getFullYear() === currentYear).reduce((a, b) => a + b.total, 0),
      anterior: sales.filter(s => new Date(s.date).getMonth() === i && new Date(s.date).getFullYear() === currentYear - 1).reduce((a, b) => a + b.total, 0)
    }));
  }, [sales]);

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black animate-pulse">Sincronizando...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen pb-32">
      {/* HEADER & FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <h2 className="text-4xl font-black uppercase italic tracking-tighter">Panel de <span className="text-[#6B7A3A]">Control</span></h2>
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-3xl border-2 border-gray-100 shadow-inner">
          <Calendar size={18} className="ml-2 text-[#6B7A3A]" />
          <input type="date" className="bg-transparent font-black text-xs p-2 outline-none" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
          <span className="text-gray-300">/</span>
          <input type="date" className="bg-transparent font-black text-xs p-2 outline-none" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          {(dateRange.start || dateRange.end) && <button onClick={() => setDateRange({start:'', end:''})} className="p-2 text-red-500"><X size={16}/></button>}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#6B7A3A]/20">
          <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Rango Filtrado</p>
          <p className="text-3xl font-black text-[#6B7A3A]">${fSales.reduce((a,b)=>a+b.total, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100">
          <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Ganancia neta del rango</p>
          <p className="text-3xl font-black text-gray-800">${analysis.totalProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* OBJETIVO Y STOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1C1C1C] p-8 rounded-[3rem] text-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#6B7A3A]">Meta Mensual</h3>
            <button onClick={() => setIsEditing(!isEditing)} className="p-2 hover:bg-white/10 rounded-full transition-all">
              {isEditing ? <X size={20}/> : <Edit3 size={18}/>}
            </button>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-4 animate-fade-in">
              <input type="number" className="bg-white/10 border-2 border-[#6B7A3A] p-4 rounded-2xl text-white font-black text-2xl w-full outline-none" value={tempGoal} onChange={e => setTempGoal(Number(e.target.value))} />
              <button onClick={async () => { await updateGlobalSettings(tempGoal, tempThreshold); setIsEditing(false); }} className="bg-[#6B7A3A] p-5 rounded-2xl"><Check size={28}/></button>
            </div>
          ) : (
            <>
              <p className="text-5xl font-black italic tracking-tighter mb-4">${fSales.reduce((a,b)=>a+b.total, 0).toLocaleString()} <span className="text-xl text-gray-500 font-normal">/ ${monthlyGoal.toLocaleString()}</span></p>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-[#6B7A3A] shadow-[0_0_15px_rgba(107,122,58,0.5)] transition-all duration-1000" style={{ width: `${Math.min((fSales.reduce((a,b)=>a+b.total, 0)/monthlyGoal)*100, 100)}%` }}></div>
              </div>
            </>
          )}
        </div>

        <div onClick={() => setActiveView('lowStock')} className={`p-8 rounded-[3rem] border-2 cursor-pointer transition-all ${products.filter(p => p.stock <= stockThreshold).length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-center">
            <AlertTriangle className={products.filter(p => p.stock <= stockThreshold).length > 0 ? 'text-red-600 animate-pulse' : 'text-gray-300'} />
            {isEditing && <input type="number" className="w-16 bg-white border-2 border-red-200 p-1 rounded-lg text-center font-black" value={tempThreshold} onChange={e => setTempThreshold(Number(e.target.value))} onClick={e => e.stopPropagation()} />}
          </div>
          <p className="text-xs font-black uppercase text-red-600 tracking-widest mt-4">Stock Crítico</p>
          <p className="text-5xl font-black">{products.filter(p => p.stock <= stockThreshold).length}</p>
        </div>
      </div>

      {/* VENDIDO VS CONSUMIDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => setActiveView(activeView === 'sold' ? 'none' : 'sold')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex justify-between items-center hover:shadow-xl transition-all">
          <div className="text-left"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unidades Vendidas</p><p className="text-4xl font-black italic tracking-tighter">{analysis.uSold} u.</p></div>
          <p className="text-2xl font-black text-[#6B7A3A]">+${analysis.totalProfit.toLocaleString()}</p>
        </button>
        <button onClick={() => setActiveView(activeView === 'consumed' ? 'none' : 'consumed')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex justify-between items-center hover:shadow-xl transition-all">
          <div className="text-left"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Consumo Propio</p><p className="text-4xl font-black italic tracking-tighter">{analysis.uCons} u.</p></div>
          <Coffee className="text-amber-500" size={32} />
        </button>
      </div>

      {/* DETALLES DINÁMICOS */}
      {activeView !== 'none' && (
        <div className="bg-gray-50 p-8 rounded-[3rem] border-2 border-[#6B7A3A]/20 animate-slide-up">
          <div className="flex justify-between items-center mb-8"><h3 className="font-black uppercase italic">{activeView === 'sold' ? 'Ganancia por Variedad' : 'Detalle de Consumos'}</h3><button onClick={() => setActiveView('none')}><X /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeView === 'sold' && Object.values(analysis.soldMap).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm">
                <div><p className="font-black text-sm uppercase">{p.name}</p><p className="text-[10px] text-gray-400 font-bold">{p.qty} unidades</p></div>
                <p className="font-black text-[#6B7A3A]">+${p.profit.toLocaleString()}</p>
              </div>
            ))}
            {activeView === 'consumed' && Object.values(analysis.consMap).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm">
                <p className="font-black text-sm uppercase">{p.name}</p>
                <p className="font-black text-amber-600">{p.qty} u.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest mb-8">Top 5 Clientes</h3>
          <div className="space-y-3">
            {topClients.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl group hover:bg-[#1C1C1C] hover:text-white transition-all">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-white text-[#1C1C1C] rounded-full flex items-center justify-center text-[10px] font-black shadow-md">{i+1}</span>
                  <div><p className="font-black text-xs uppercase truncate w-32">{c.name}</p><p className="text-[9px] font-bold text-[#6B7A3A] uppercase">Fav: {c.fav}</p></div>
                </div>
                <p className="font-black text-sm">${c.spent.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest mb-8">Top 5 Variedades</h3>
          <div className="space-y-3">
            {topVarieties.map((p: any, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[#6B7A3A] text-white rounded-lg flex items-center justify-center text-[10px] font-black">{p.qty}</div>
                  <p className="font-black text-xs uppercase truncate w-32">{p.name}</p>
                </div>
                <p className="font-black text-[#6B7A3A] text-sm">+${(p.profit || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRÁFICO COMPARATIVO */}
      <div className="bg-[#1C1C1C] p-8 md:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-12">Comparativa de Ventas Anual</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10, fontWeight: 'bold'}} />
              <Tooltip contentStyle={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }} />
              <Area type="monotone" dataKey="actual" stroke="#6B7A3A" strokeWidth={5} fill="#6B7A3A" fillOpacity={0.2} />
              <Area type="monotone" dataKey="anterior" stroke="rgba(255,255,255,0.1)" strokeWidth={2} fill="transparent" strokeDasharray="10 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
