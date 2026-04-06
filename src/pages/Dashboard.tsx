import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, Target, Users, Package, AlertTriangle, 
  Coffee, ChevronRight, ArrowUpRight, Calendar, 
  DollarSign, Info, UserX, ShoppingBag, X, Check, Edit3, BarChart2
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
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempGoal, setTempGoal] = useState(monthlyGoal);
  const [tempThreshold, setTempThreshold] = useState(stockThreshold);

  useEffect(() => {
    setTempGoal(monthlyGoal);
    setTempThreshold(stockThreshold);
  }, [monthlyGoal, stockThreshold]);

  // --- 1. FILTRADO MAESTRO (TODO DEPENDE DE ESTO) ---
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const sDate = s.date.split('T')[0];
      const matchesStart = dateRange.start ? sDate >= dateRange.start : true;
      const matchesEnd = dateRange.end ? sDate <= dateRange.end : true;
      return matchesStart && matchesEnd;
    });
  }, [sales, dateRange]);

  const filteredConsumptions = useMemo(() => {
    return consumptions.filter(c => {
      const cDate = c.date.split('T')[0];
      const matchesStart = dateRange.start ? cDate >= dateRange.start : true;
      const matchesEnd = dateRange.end ? cDate <= dateRange.end : true;
      return matchesStart && matchesEnd;
    });
  }, [consumptions, dateRange]);

  // --- 2. MÉTRICAS DE PERIODOS ---
  const periods = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

    return {
      range: filteredSales.reduce((acc, s) => acc + s.total, 0),
      month: sales.filter(s => s.date.split('T')[0] >= startOfMonth).reduce((acc, s) => acc + s.total, 0),
      quarter: sales.filter(s => s.date.split('T')[0] >= threeMonthsAgo).reduce((acc, s) => acc + s.total, 0),
      year: sales.filter(s => s.date.split('T')[0] >= startOfYear).reduce((acc, s) => acc + s.total, 0),
      allTime: sales.reduce((acc, s) => acc + s.total, 0)
    };
  }, [sales, filteredSales]);

  // --- 3. ANÁLISIS DE PRODUCTOS (SOLUCIÓN DUPLICADOS) ---
  const analysis = useMemo(() => {
    const soldMap: Record<string, any> = {};
    const consumedMap: Record<string, any> = {};
    let totalProfit = 0;
    let uSold = 0;
    let uConsumed = 0;

    filteredSales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        const pId = (item.id || item.product_id || '').toLowerCase(); // Normalizamos ID
        if (!pId) return;

        uSold += item.quantity;
        const prod = products.find(p => p.id.toLowerCase() === pId);
        const cost = prod ? prod.costPrice : 0;
        const profit = (item.appliedPrice - cost) * item.quantity;
        totalProfit += profit;

        if (!soldMap[pId]) soldMap[pId] = { name: item.name, qty: 0, profit: 0 };
        soldMap[pId].qty += item.quantity;
        soldMap[pId].profit += profit;
      });
    });

    filteredConsumptions.forEach(c => {
      const pId = (c.productId || c.product_id || '').toLowerCase();
      uConsumed += c.quantity;
      if (!consumedMap[pId]) consumedMap[pId] = { name: c.productName || 'Variedad Desconocida', qty: 0 };
      consumedMap[pId].qty += c.quantity;
    });

    return { uSold, uConsumed, totalProfit, soldMap, consumedMap };
  }, [filteredSales, filteredConsumptions, products]);

  // --- 4. COMPARATIVO ANUAL ---
  const chartData = useMemo(() => {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const currentYear = new Date().getFullYear();
    return months.map((m, i) => {
      const actual = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === i && d.getFullYear() === currentYear;
      }).reduce((acc, s) => acc + s.total, 0);

      const anterior = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === i && d.getFullYear() === currentYear - 1;
      }).reduce((acc, s) => acc + s.total, 0);

      return { name: m, actual, anterior };
    });
  }, [sales]);

  // --- 5. LOGICA DE ALERTAS ---
  const dormantCount = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() - 45);
    return clients.filter(c => {
      const cSales = sales.filter(s => s.clientId === c.id);
      if (cSales.length === 0) return true;
      return new Date(Math.max(...cSales.map(s => new Date(s.date).getTime()))) < limit;
    }).length;
  }, [clients, sales]);

  const handleSaveSettings = async () => {
    await updateGlobalSettings(tempGoal, tempThreshold);
    setIsEditingSettings(false);
  };

  if (isLoading) return <div className="p-20 text-center font-black animate-pulse uppercase">Sincronizando La Tostadora...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen pb-32 text-[#1C1C1C]">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Control <span className="text-[#6B7A3A]">Total</span></h2>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mt-2">Dashboard de Rendimiento</p>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-[2rem] border-2 border-gray-100 shadow-inner">
          <Calendar size={18} className="text-[#6B7A3A] ml-2" />
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent font-black text-[10px] outline-none" />
          <span className="text-gray-300 font-bold">/</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent font-black text-[10px] outline-none" />
          {(dateRange.start || dateRange.end) && (
            <button onClick={() => setDateRange({start:'', end:''})} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:rotate-90 transition-all"><X size={14}/></button>
          )}
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES (BASADAS EN FILTRO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Rango Seleccionado', val: periods.range, color: 'text-[#6B7A3A]' },
          { label: 'Este Mes', val: periods.month, color: 'text-[#1C1C1C]' },
          { label: 'Últimos 3 Meses', val: periods.quarter, color: 'text-[#1C1C1C]' },
          { label: 'Histórico Total', val: periods.allTime, color: 'text-gray-400' }
        ].map((k, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100">
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">{k.label}</p>
            <p className={`text-3xl font-black tracking-tighter ${k.color}`}>${k.val.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* OBJETIVO Y STOCK (EDITABLES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1C1C1C] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#6B7A3A]">Meta de Ventas Mensual</h3>
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
              <p className="text-5xl font-black italic tracking-tighter mb-4">
                ${periods.month.toLocaleString()} <span className="text-xl text-gray-500 font-normal">/ ${monthlyGoal.toLocaleString()}</span>
              </p>
              <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-[#6B7A3A] shadow-[0_0_15px_rgba(107,122,58,0.5)] transition-all duration-1000" style={{ width: `${Math.min((periods.month/monthlyGoal)*100, 100)}%` }}></div>
              </div>
            </>
          )}
        </div>

        <div className={`p-8 rounded-[3rem] border-2 transition-all flex flex-col justify-between ${products.filter(p => p.stock <= stockThreshold).length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex justify-between items-center">
            <AlertTriangle className={products.filter(p => p.stock <= stockThreshold).length > 0 ? 'text-red-600 animate-pulse' : 'text-gray-300'} />
            {isEditingSettings ? (
              <div className="text-right">
                <p className="text-[8px] font-black uppercase text-red-400">Stock Bajo si es ≤</p>
                <input type="number" value={tempThreshold} onChange={e => setTempThreshold(Number(e.target.value))} className="w-16 bg-white border-2 border-red-200 p-1 rounded-lg text-center font-black" />
              </div>
            ) : (
              <span className="text-[9px] font-black uppercase text-gray-400">Umbral: {stockThreshold}u</span>
            )}
          </div>
          <div onClick={() => setActiveView(activeView === 'lowStock' ? 'none' : 'lowStock')} className="cursor-pointer">
            <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Stock Crítico</p>
            <p className="text-5xl font-black tracking-tighter">{products.filter(p => p.stock <= stockThreshold).length}</p>
          </div>
        </div>
      </div>

      {/* ANALISIS DE UNIDADES (VENDIDAS VS CONSUMIDAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <button onClick={() => setActiveView(activeView === 'sold' ? 'none' : 'sold')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex items-center justify-between hover:shadow-xl transition-all">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#6B7A3A]/10 text-[#6B7A3A] rounded-3xl flex items-center justify-center"><ShoppingBag size={32}/></div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unidades Vendidas</p>
              <p className="text-4xl font-black italic tracking-tighter">{analysis.uSold} u.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-[#6B7A3A]">Rentabilidad</p>
            <p className="text-2xl font-black text-[#6B7A3A]">+${analysis.totalProfit.toLocaleString()}</p>
          </div>
        </button>

        <button onClick={() => setActiveView(activeView === 'consumed' ? 'none' : 'consumed')} className="bg-white p-8 rounded-[3rem] border-2 border-gray-100 flex items-center justify-between hover:shadow-xl transition-all">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center"><Coffee size={32}/></div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Consumo Propio</p>
              <p className="text-4xl font-black italic tracking-tighter">{analysis.uConsumed} u.</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-1 rounded-full mb-1">Total Acumulado</span>
            <ChevronRight size={20} className="text-amber-300" />
          </div>
        </button>
      </div>

      {/* PANEL INTERACTIVO DE DETALLES */}
      {activeView !== 'none' && (
        <div className="bg-gray-50 rounded-[3rem] p-8 border-2 border-[#6B7A3A]/20 animate-slide-up">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              {activeView === 'sold' && 'Desglose de Rentabilidad'}
              {activeView === 'consumed' && 'Detalle de Consumos'}
              {activeView === 'lowStock' && 'Productos por agotar'}
            </h3>
            <button onClick={() => setActiveView('none')} className="p-2 bg-white rounded-full shadow-sm"><X size={20}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeView === 'sold' && Object.values(analysis.soldMap).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center border-2 border-gray-100">
                <div><p className="font-black text-sm uppercase">{p.name}</p><p className="text-[10px] text-gray-400 font-bold">{p.qty} unidades</p></div>
                <p className="font-black text-[#6B7A3A] text-lg">+${p.profit.toLocaleString()}</p>
              </div>
            ))}
            {activeView === 'consumed' && Object.values(analysis.consumedMap).map((p: any, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center border-2 border-gray-100">
                <p className="font-black text-sm uppercase">{p.name}</p>
                <p className="font-black text-amber-600 text-lg">{p.qty} u.</p>
              </div>
            ))}
            {activeView === 'lowStock' && products.filter(p => p.stock <= stockThreshold).map((p, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl flex justify-between items-center border-2 border-red-100">
                <p className="font-black text-sm uppercase">{p.name}</p>
                <p className="font-black text-red-600 text-lg">{p.stock} disp.</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPARATIVA ANUAL (LÍNEAS) */}
      <div className="bg-[#1C1C1C] p-8 md:p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Comparativo de Ventas Anual</h3>
              <p className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em]">Cifras expresadas en Pesos ($)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#6B7A3A]"/> <span className="text-[10px] font-black uppercase">Actual</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white/10"/> <span className="text-[10px] font-black uppercase">Anterior</span></div>
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
