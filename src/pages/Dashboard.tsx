import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, Users, AlertTriangle, Coffee, 
  ChevronRight, ArrowUpRight, Calendar, 
  DollarSign, Info, UserX, ShoppingBag, X, Check, Edit3
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { 
    sales = [], products = [], clients = [], consumptions = [], 
    monthlyGoal, stockThreshold, updateGlobalSettings, isLoading 
  } = useStore();

  // ESTADOS PARA INTERACTIVIDAD Y CONFIG
  const [activeView, setActiveView] = useState<'none' | 'sold' | 'consumed' | 'lowStock' | 'dormant'>('none');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempGoal, setTempGoal] = useState(monthlyGoal);
  const [tempThreshold, setTempThreshold] = useState(stockThreshold);

  // Sincronizar estados locales cuando los globales cambian en el Store
  useEffect(() => {
    setTempGoal(monthlyGoal);
    setTempThreshold(stockThreshold);
  }, [monthlyGoal, stockThreshold]);

  // --- 1. FILTRADO MAESTRO POR FECHA ---
  const fSales = useMemo(() => sales.filter(s => {
    const d = s.date?.substring(0, 10);
    return (!dateRange.start || d >= dateRange.start) && (!dateRange.end || d <= dateRange.end);
  }), [sales, dateRange]);

  const fConsumptions = useMemo(() => consumptions.filter(c => {
    const d = c.date?.substring(0, 10);
    return (!dateRange.start || d >= dateRange.start) && (!dateRange.end || d <= dateRange.end);
  }), [consumptions, dateRange]);

  // --- 2. MÉTRICAS DE TIEMPO (TARJETAS SUPERIORES) ---
  const metrics = useMemo(() => {
    const now = new Date().toISOString().substring(0, 10);
    const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
    const startYear = new Date(new Date().getFullYear(), 0, 1).toISOString().substring(0, 10);

    return {
      filtered: fSales.reduce((acc, s) => acc + (s.total || 0), 0),
      month: sales.filter(s => s.date?.substring(0, 10) >= startMonth).reduce((acc, s) => acc + (s.total || 0), 0),
      year: sales.filter(s => s.date?.substring(0, 10) >= startYear).reduce((acc, s) => acc + (s.total || 0), 0),
      allTime: sales.reduce((acc, s) => acc + (s.total || 0), 0)
    };
  }, [sales, fSales]);

  // --- 3. ANÁLISIS DE PRODUCTOS (SOLUCIÓN DUPLICADOS CATUAI) ---
  const analysis = useMemo(() => {
    const soldMap: Record<string, any> = {};
    const consMap: Record<string, any> = {};
    let totalProfit = 0, uSold = 0, uCons = 0;

    fSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const name = item.name; // Agrupar por nombre es lo más seguro para evitar duplicados visuales
        uSold += Number(item.quantity || 0);
        const prod = products.find(p => p.name === name);
        const profit = (Number(item.appliedPrice || 0) - Number(prod?.costPrice || 0)) * Number(item.quantity || 0);
        totalProfit += profit;
        
        if (!soldMap[name]) soldMap[name] = { name, qty: 0, profit: 0 };
        soldMap[name].qty += Number(item.quantity || 0);
        soldMap[name].profit += profit;
      });
    });

    fConsumptions.forEach(c => {
      const name = c.productName || 'Variedad';
      uCons += Number(c.quantity || 0);
      if (!consMap[name]) consMap[name] = { name, qty: 0 };
      consMap[name].qty += Number(c.quantity || 0);
    });

    return { uSold, uCons, totalProfit, soldMap, consMap };
  }, [fSales, fConsumptions, products]);

  // --- 4. RANKINGS Y ALERTAS ---
  const topClients = useMemo(() => clients.map(c => {
    const cSales = sales.filter(s => s.clientId === c.id);
    const spent = cSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const varietyCount: any = {};
    cSales.forEach(s => s.items?.forEach((i: any) => varietyCount[i.name] = (varietyCount[i.name] || 0) + i.quantity));
    const fav = Object.entries(varietyCount).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] || '---';
    return { ...c, spent, fav };
  }).sort((a, b) => b.spent - a.spent).slice(0, 5), [clients, sales]);

  const dormantCount = useMemo(() => {
    const limit = new Date(); limit.setDate(limit.getDate() - 45);
    return clients.filter(c => {
      const s = sales.filter(x => x.clientId === c.id);
      return s.length === 0 || new Date(Math.max(...s.map(x => new Date(x.date).getTime()))) < limit;
    }).length;
  }, [clients, sales]);

  // --- 5. GRÁFICO COMPARATIVO ANUAL ---
  const chartData = useMemo(() => {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const curYear = new Date().getFullYear();
    return months.map((m, i) => ({
      name: m,
      actual: sales.filter(s => new Date(s.date).getMonth() === i && new Date(s.date).getFullYear() === curYear).reduce((a, b) => a + b.total, 0),
      anterior: sales.filter(s => new Date(s.date).getMonth() === i && new Date(s.date).getFullYear() === curYear - 1).reduce((a, b) => a + b.total, 0)
    }));
  }, [sales]);

  const handleSaveSettings = async () => {
    try {
      await updateGlobalSettings(tempGoal, tempThreshold);
      setIsEditingSettings(false);
    } catch (e) {
      alert("Error al guardar configuraciones");
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black animate-pulse uppercase">Actualizando Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen pb-32 text-[#1C1C1C]">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Dashboard</h2>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mt-2">La Tostadora v3.5</p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-[2rem] border-2 border-gray-100 shadow-inner">
          <Calendar size={18} className="text-[#6B7A3A] ml-2" />
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent font-black text-[10px] outline-none uppercase" />
          <span className="text-gray-300 font-bold">/</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent font-black text-[10px] outline-none uppercase" />
          {(dateRange.start || dateRange.end) && (
            <button onClick={() => setDateRange({start:'', end:''})} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:scale-110 transition-all"><X size={14}/></button>
          )}
        </div>
      </div>

      {/* KPI CARDS (RESPONDIENDO A FILTROS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Rango Filtrado', val: metrics.filtered, color: 'text-[#6B7A3A]' },
          { label: 'Este Mes', val: metrics.month, color: 'text-[#1C1C1C]' },
          { label: 'Año actual', val: metrics.year, color: 'text-[#1C1C1C]' },
          { label: 'Total Histórico', val: metrics.allTime, color: 'text-gray-400' }
        ].map((k, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">{k.label}</p>
            <p className={`text-3xl font-black tracking-tighter ${k.color}`}>${k.val.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* OBJETIVO Y STOCK CRITICO (BARRA NEGRA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1C1C1C] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#6B7A3A]">Objetivo de Venta Mensual</h3>
            <button onClick={() => setIsEditingSettings(!isEditingSettings)} className="p-2 hover:bg-white/10 rounded-full transition-all">
              {isEditingSettings ? <X size={20}/> : <Edit3 size={18}/>}
            </button>
          </div>
          
          {isEditingSettings ? (
            <div className="flex items-center gap-4 animate-fade-in mb-4">
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase text-gray-500 mb-1 ml-1">Nuevo Objetivo ($)</p>
                <input type="number" value={tempGoal} onChange={e => setTempGoal(Number(e.target.value))} className="w-full bg-white/10 border-2 border-[#6B7A3A] p-4 rounded-2xl text-2xl font-black outline-none" />
              </div>
              <button onClick={handleSaveSettings} className="bg-[#6B7A3A] p-5 rounded-2xl mt-5 hover:scale-105 transition-all"><Check size={28}/></button>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-3 mb-4">
                <p className="text-5xl font-black italic tracking-tighter">${metrics.month.toLocaleString()}</p>
                <p className="text-lg text-gray-500 font-normal">/ ${monthlyGoal.toLocaleString()}</p>
              </div>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-[#6B7A3A] shadow-[0_0_15px_rgba(107,122,58,0.5)] transition-all duration-1000" style={{ width: `${Math.min((metrics.month/monthlyGoal)*100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] font-black uppercase text-gray-500 mt-4 tracking-widest">Progreso: {((metrics.month/monthlyGoal)*100).toFixed(1)}%</p>
            </>
          )}
        </div>

        <div onClick={() => setActiveView('lowStock')} className={`p-8 rounded-[3rem] border-2 cursor-pointer transition-all flex flex-col justify-between ${products.filter(p => p.stock <= stockThreshold).length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex justify-between items-center">
            <AlertTriangle className={products.filter(p => p.stock <= stockThreshold).length > 0 ? 'text-red-600 animate-pulse' : 'text-gray-300'} />
            {isEditingSettings ? (
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-red-400">Umbral Stock</p>
                <input type="number" value={tempThreshold} onChange={e => setTempThreshold(Number(e.target.value))} className="w-16 bg-white border-2 border-red-200 p-1 rounded-lg text-center font-black" onClick={e => e.stopPropagation()} />
              </div>
            ) : (
              <span className="text-[9px] font-black uppercase text-gray-400">Config: {stockThreshold}u</span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Stock Crítico</p>
            <p className="text-5xl font-black tracking-tighter">{products.filter(p => p.stock <= stockThreshold).length}</p>
          </div>
        </div>
      </div>

      {/* VENDIDO VS CONSUMIDO (INTERACTIVOS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => setActiveView(activeView === 'sold' ? 'none' : 'sold')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex justify-between items-center hover:shadow-xl transition-all">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unidades Vendidas</p>
            <p className="text-4xl font-black italic tracking-tighter">{analysis.uSold} u.</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-[#6B7A3A]">Rentabilidad</p>
            <p className="text-2xl font-black text-[#6B7A3A]">+${analysis.totalProfit.toLocaleString()}</p>
          </div>
        </button>

        <button onClick={() => setActiveView(activeView === 'consumed' ? 'none' : 'consumed')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex justify-between items-center hover:shadow-xl transition-all">
          <div className="text-left">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Consumo Propio</p>
            <p className="text-4xl font-black italic tracking-tighter">{analysis.uCons} u.</p>
          </div>
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center"><Coffee size={32}/></div>
        </button>
      </div>

      {/* PANEL DE DETALLES DESPLEGABLE */}
      {activeView !== 'none' && (
        <div className="bg-gray-50 rounded-[3rem] p-8 border-2 border-[#6B7A3A]/20 animate-slide-up">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black uppercase italic tracking-tighter">
              {activeView === 'sold' ? 'Desglose por Variedad' : activeView === 'consumed' ? 'Detalle de Consumo Propio' : 'Variedades con Stock Bajo'}
            </h3>
            <button onClick={() => setActiveView('none')} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeView === 'sold' && Object.values(analysis.soldMap).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm">
                <div><p className="font-black text-sm uppercase">{p.name}</p><p className="text-[10px] text-gray-400 font-bold">{p.qty} unidades</p></div>
                <p className="font-black text-[#6B7A3A] text-lg">+${p.profit.toLocaleString()}</p>
              </div>
            ))}
            {activeView === 'consumed' && Object.values(analysis.consMap).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center shadow-sm">
                <p className="font-black text-sm uppercase">{p.name}</p>
                <p className="font-black text-amber-600 text-lg">{p.qty} u.</p>
              </div>
            ))}
            {activeView === 'lowStock' && products.filter(p => p.stock <= stockThreshold).map((p, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center border border-red-100">
                <p className="font-black text-sm uppercase">{p.name}</p>
                <p className="font-black text-red-600">{p.stock} u.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RANKINGS (RESTABLECIDOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Users size={16} className="text-[#6B7A3A]"/> Top 5 Clientes</h3>
            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${dormantCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
              {dormantCount} Inactivos
            </span>
          </div>
          <div className="space-y-3">
            {topClients.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl group hover:bg-[#1C1C1C] hover:text-white transition-all">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-white text-[#1C1C1C] rounded-full flex items-center justify-center text-[10px] font-black shadow-md">{i+1}</span>
                  <div>
                    <p className="font-black text-xs uppercase truncate w-32">{c.name}</p>
                    <p className="text-[9px] font-bold text-[#6B7A3A] uppercase">Fav: {c.fav}</p>
                  </div>
                </div>
                <p className="font-black text-sm">${c.spent.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8"><ShoppingBag size={16} className="text-[#6B7A3A]"/> Top 5 Variedades</h3>
          <div className="space-y-3">
            {topVarieties.map((p: any, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[#6B7A3A] text-white rounded-lg flex items-center justify-center text-[10px] font-black">{p.qty}</div>
                  <p className="font-black text-xs uppercase truncate w-32">{p.name}</p>
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

      {/* GRÁFICO COMPARATIVO ANUAL */}
      <div className="bg-[#1C1C1C] p-8 md:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#6B7A3A]/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Comparativa de Ventas</h3>
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em]">Cifras en Pesos Argentinos ($)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6B7A3A]"/> <span className="text-[10px] font-black uppercase">2026</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white/10"/> <span className="text-[10px] font-black uppercase">2025</span></div>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B7A3A" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6B7A3A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{ backgroundColor: '#1C1C1C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }} />
                <Area type="monotone" dataKey="actual" stroke="#6B7A3A" strokeWidth={5} fill="url(#colorAct)" />
                <Area type="monotone" dataKey="anterior" stroke="rgba(255,255,255,0.1)" strokeWidth={2} fill="transparent" strokeDasharray="10 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
