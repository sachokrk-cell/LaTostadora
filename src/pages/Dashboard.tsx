import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { DollarSign, Package, ShoppingBag, TrendingUp, X, Settings, Coffee, ShoppingCart, Award, List, Wallet, User as UserIcon, Calendar, Filter, ChevronDown, CheckSquare, Square, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ModalProps {
  title: string;
  children?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

const Modal = ({ title, children, onClose, maxWidth = 'max-w-2xl' }: ModalProps) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-gray-900">
    <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col border-4 border-gray-900`}>
      <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-[1.8rem] flex-shrink-0">
        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-900">
          <X size={28} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">
        {children}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { sales = [], products = [] } = useStore();
  
  // ESTADOS Y PERSISTENCIA
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [activeModal, setActiveModal] = useState<'stock' | 'goals' | null>(null);
  
  const [stockThreshold, setStockThreshold] = useState(() => Number(localStorage.getItem('lt_stock_threshold')) || 10);
  const [monthlyGoal, setMonthlyGoal] = useState(() => Number(localStorage.getItem('lt_monthly_goal')) || 1000000);

  useEffect(() => {
    localStorage.setItem('lt_stock_threshold', stockThreshold.toString());
    localStorage.setItem('lt_monthly_goal', monthlyGoal.toString());
  }, [stockThreshold, monthlyGoal]);

  const setQuickRange = (months: number | 'all') => {
    const end = new Date();
    const start = new Date();
    if (months === 'all') { setStartDate(''); setEndDate(''); }
    else {
      start.setMonth(start.getMonth() - months);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // LÓGICA DE DATOS
  const { metrics, filteredSales, lowStockProducts } = useMemo(() => {
    const filtered = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      const matchesDate = (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
      const matchesVar = selectedVarieties.length === 0 || s.items.some(i => selectedVarieties.includes(i.id));
      return matchesDate && matchesVar;
    });

    let rev = 0, cost = 0, units = 0;
    filtered.forEach(s => s.items.forEach(i => {
      if (selectedVarieties.length === 0 || selectedVarieties.includes(i.id)) {
        rev += (Number(i.appliedPrice) * Number(i.quantity));
        const p = products.find(prod => prod.id === i.id);
        cost += (Number(p?.costPrice || 0) * Number(i.quantity));
        units += Number(i.quantity);
      }
    }));

    return {
      filteredSales: filtered,
      metrics: { rev, cost, units, outstanding: filtered.reduce((acc, s) => acc + Number(s.balance || 0), 0) },
      lowStockProducts: products.filter(p => Number(p.stock) <= stockThreshold)
    };
  }, [sales, products, startDate, endDate, selectedVarieties, stockThreshold]);

  // TENDENCIAS TEMPORALES (Comparativa este año vs año anterior)
  const yearlyComparisonData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const currentYearSales = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      }).reduce((acc, s) => acc + Number(s.total), 0);

      const lastYearSales = sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === index && d.getFullYear() === currentYear - 1;
      }).reduce((acc, s) => acc + Number(s.total), 0);

      return { name: month, Actual: currentYearSales, Anterior: lastYearSales };
    });
  }, [sales]);

  const goalProgress = Math.min(Math.round((metrics.rev / monthlyGoal) * 100), 100);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 bg-white min-h-screen text-gray-900">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tighter text-gray-900">Dashboard</h2>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">Métricas de Rendimiento</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['MES', '3 MESES', 'AÑO'].map((label, i) => (
            <button key={i} onClick={() => setQuickRange(i === 0 ? 1 : i === 1 ? 3 : 12)} className="px-5 py-2.5 bg-gray-100 rounded-2xl font-black text-xs hover:bg-gray-900 hover:text-white transition-all">{label}</button>
          ))}
          <button onClick={() => setQuickRange('all')} className="px-5 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-xs">TODO</button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-6 rounded-[2.5rem] border-2 border-gray-100">
        <div className="flex items-center gap-3">
          <Calendar className="text-gray-400" size={24} />
          <div className="flex items-center gap-2 flex-1 font-black">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-white rounded-xl border-2 border-gray-200" />
            <span>-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-white rounded-xl border-2 border-gray-200" />
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowVarietyDropdown(!showVarietyDropdown)} className="w-full flex justify-between items-center p-3 bg-white rounded-xl border-2 border-gray-200 font-black">
            <div className="flex items-center gap-2"><Coffee size={20}/> {selectedVarieties.length || 'Todas'} Variedades</div>
            <ChevronDown size={20}/>
          </button>
          {showVarietyDropdown && (
            <div className="absolute top-full w-full mt-2 bg-white border-4 border-gray-900 rounded-[2rem] shadow-2xl z-50 p-4 space-y-2 max-h-60 overflow-y-auto">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer font-bold">
                  <input type="checkbox" className="hidden" checked={selectedVarieties.includes(p.id)} onChange={() => setSelectedVarieties(prev => prev.includes(p.id) ? prev.filter(v => v !== p.id) : [...prev, p.id])} />
                  {selectedVarieties.includes(p.id) ? <CheckSquare size={24}/> : <Square size={24} className="text-gray-200"/>}
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => { setStartDate(''); setEndDate(''); setSelectedVarieties([]); }} className="bg-red-600 text-white font-black rounded-xl hover:bg-red-700 transition-all">LIMPIAR TODO</button>
      </div>

      {/* OBJETIVOS VS REALIDAD (NUEVO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs tracking-widest mb-2">
                  <Target size={20}/> Meta del Periodo
                </div>
                <h3 className="text-5xl font-black tracking-tighter">${metrics.rev.toLocaleString()}</h3>
                <p className="text-gray-400 font-bold mt-1">de un objetivo de ${monthlyGoal.toLocaleString()}</p>
              </div>
              <button onClick={() => setActiveModal('goals')} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white">
                <Settings size={24}/>
              </button>
            </div>
            
            <div className="mt-8 space-y-4">
              <div className="flex justify-between font-black text-sm uppercase">
                <span>Progreso</span>
                <span>{goalProgress}%</span>
              </div>
              <div className="w-full h-6 bg-white/10 rounded-full overflow-hidden border-2 border-white/5">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-1000" style={{ width: `${goalProgress}%` }}></div>
              </div>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-gray-900 flex flex-col justify-center items-center text-center">
          <div className="p-4 bg-green-100 rounded-3xl text-green-700 mb-4">
            <TrendingUp size={40}/>
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Utilidad Estimada</p>
          <h3 className="text-4xl font-black text-gray-900 mt-1">${(metrics.rev - metrics.cost).toLocaleString()}</h3>
          <p className="text-sm font-bold text-gray-500 mt-2">Rentabilidad: {metrics.rev > 0 ? Math.round(((metrics.rev - metrics.cost) / metrics.rev) * 100) : 0}%</p>
        </div>
      </div>

      {/* TENDENCIAS TEMPORALES (Comparativa YoY) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-black tracking-tighter">Tendencia Mensual</h3>
              <p className="text-xs font-bold text-gray-400 uppercase">Año Actual vs Año Anterior</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-black uppercase">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-900 rounded-full"></div> Actual</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded-full"></div> Anterior</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyComparisonData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000', fontWeight: 'bold', fontSize: 10}} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="Actual" stroke="#111827" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" />
                <Area type="monotone" dataKey="Anterior" stroke="#d1d5db" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-md border border-gray-100">
            <ShoppingBag className="text-blue-500 mb-4" size={32}/>
            <p className="text-[10px] font-black uppercase text-gray-400">Unidades</p>
            <h4 className="text-3xl font-black">{metrics.units.toLocaleString()}</h4>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] shadow-md border border-gray-100 text-red-600">
            <Package className="mb-4" size={32}/>
            <p className="text-[10px] font-black uppercase text-gray-400">Stock Crítico</p>
            <h4 className="text-3xl font-black">{products.filter(p => p.stock <= stockThreshold).length}</h4>
          </div>
          <div className="bg-indigo-50 p-6 rounded-[2.5rem] border-2 border-indigo-100 col-span-2">
            <Wallet className="text-indigo-600 mb-2" size={32}/>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-400">Deuda Total de Clientes</p>
                <h4 className="text-4xl font-black text-indigo-900">${metrics.outstanding.toLocaleString()}</h4>
              </div>
              <ArrowUpRight size={40} className="text-indigo-200" />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CONFIGURACIÓN METAS */}
      {activeModal === 'goals' && (
        <Modal title="Configurar Objetivo" onClose={() => setActiveModal(null)}>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-200">
              <label className="block text-sm font-black text-gray-700 uppercase mb-2">Meta de Venta Mensual ($)</label>
              <input 
                type="number" 
                value={monthlyGoal} 
                onChange={(e) => setMonthlyGoal(Number(e.target.value))}
                className="w-full p-4 text-3xl font-black rounded-2xl border-4 border-gray-900 focus:ring-0 outline-none"
              />
              <p className="text-xs text-gray-400 font-bold mt-4 uppercase">Este valor se usará para calcular la barra de progreso en el Dashboard principal.</p>
            </div>
            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100">
              <label className="block text-sm font-black text-amber-900 uppercase mb-2">Umbral de Alerta Stock</label>
              <input 
                type="number" 
                value={stockThreshold} 
                onChange={(e) => setStockThreshold(Number(e.target.value))}
                className="w-full p-4 text-2xl font-black rounded-2xl border-2 border-amber-900 bg-white"
              />
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xl hover:bg-black transition-all">GUARDAR CAMBIOS</button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;
