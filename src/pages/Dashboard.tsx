import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, 
  Target, 
  ShoppingBag, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  AlertCircle,
  Coffee
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const Dashboard = () => {
  const { sales, products, clients, monthlyGoal, stockThreshold, isLoading } = useStore();

  // --- LÓGICA DE CÁLCULO DE MÉTRICAS ---
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Ventas del mes actual
    const monthSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalMonthRevenue = monthSales.reduce((acc, s) => acc + s.total, 0);
    const goalProgress = (totalMonthRevenue / monthlyGoal) * 100;
    
    // Productos con stock bajo
    const lowStockCount = products.filter(p => p.stock <= stockThreshold).length;

    return {
      totalMonthRevenue,
      goalProgress,
      salesCount: monthSales.length,
      lowStockCount,
      activeClients: clients.length
    };
  }, [sales, products, clients, monthlyGoal, stockThreshold]);

  // --- DATOS PARA EL GRÁFICO DE BARRAS (Ventas por Día) ---
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayTotal = sales
        .filter(s => s.date.split('T')[0] === date)
        .reduce((acc, s) => acc + s.total, 0);
      
      return {
        name: new Date(date).toLocaleDateString('es-AR', { weekday: 'short' }),
        total: dayTotal
      };
    });
  }, [sales]);

  // --- TOP PRODUCTOS ---
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string, qty: number }> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        if (!counts[item.id]) counts[item.id] = { name: item.name, qty: 0 };
        counts[item.id].qty += item.quantity;
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#6B7A3A]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 text-[#1C1C1C] bg-white min-h-screen animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Panel de Control</h2>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Resultados de La Tostadora</p>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card: Ventas del Mes */}
        <div className="bg-[#1C1C1C] p-6 rounded-[2.5rem] text-[#E8DFC8] shadow-xl relative overflow-hidden group">
          <TrendingUp className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7A3A] mb-4">Ventas del Mes</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black tracking-tighter">${stats.totalMonthRevenue.toLocaleString()}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold">
            <span className="bg-[#6B7A3A] text-white px-2 py-0.5 rounded-full">{stats.salesCount} tickets</span>
            <span className="text-gray-400">marzo-abril</span>
          </div>
        </div>

        {/* Card: Objetivo */}
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-50 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Meta Mensual</p>
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-black tracking-tighter">{stats.goalProgress.toFixed(1)}%</span>
            <Target className="text-[#6B7A3A]" size={24} />
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-[#6B7A3A] h-full transition-all duration-1000" 
              style={{ width: `${Math.min(stats.goalProgress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card: Clientes */}
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-50 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Clientes Activos</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black tracking-tighter">{stats.activeClients}</span>
            <Users className="text-[#1C1C1C]" size={24} />
          </div>
          <p className="text-[9px] font-bold text-green-600 mt-4 uppercase tracking-widest flex items-center gap-1">
            <ArrowUpRight size={12} /> Creciendo en marzo
          </p>
        </div>

        {/* Card: Stock Crítico */}
        <div className={`p-6 rounded-[2.5rem] border-2 shadow-sm transition-all ${stats.lowStockCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-50'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-4">Alertas de Stock</p>
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-black tracking-tighter ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-300'}`}>
              {stats.lowStockCount}
            </span>
            <AlertCircle className={stats.lowStockCount > 0 ? 'text-red-600 animate-pulse' : 'text-gray-300'} size={24} />
          </div>
          <p className="text-[9px] font-bold text-gray-400 mt-4 uppercase tracking-widest">Variedades por agotar</p>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico Principal: Ventas 7 días */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border-2 border-gray-50 shadow-sm">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
               <TrendingUp size={18} className="text-[#6B7A3A]" /> Rendimiento Semanal
             </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B7A3A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6B7A3A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#999' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#6B7A3A" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranking de Productos */}
        <div className="bg-[#1C1C1C] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
          <Coffee className="absolute -right-10 -bottom-10 w-40 h-40 text-white/5" />
          <h3 className="text-sm font-black uppercase tracking-widest mb-8 text-[#6B7A3A]">Más Vendidos</h3>
          <div className="space-y-6 relative z-10">
            {topProducts.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-[#6B7A3A]">0{idx + 1}</span>
                  <p className="text-xs font-black uppercase italic tracking-tighter truncate w-32 group-hover:text-[#6B7A3A] transition-colors">
                    {prod.name}
                  </p>
                </div>
                <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black">
                  {prod.qty} un.
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-xs text-gray-500 italic">No hay ventas registradas aún.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
