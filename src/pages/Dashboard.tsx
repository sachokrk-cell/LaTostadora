import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { DollarSign, Package, ShoppingBag, TrendingUp, X, Settings, Coffee, ShoppingCart, Award, List, Wallet, User as UserIcon, Calendar, Filter, ChevronDown, CheckSquare, Square, Target, Trophy, Medal, Crown, Utensils } from 'lucide-react';

interface ModalProps {
  title: string;
  children?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

const Modal = ({ title, children, onClose, maxWidth = 'max-w-2xl' }: ModalProps) => (
  <div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in text-gray-900">
    <div className={`bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full ${maxWidth} max-h-[95vh] sm:max-h-[90vh] flex flex-col border-t-4 sm:border-4 border-gray-900`}>
      <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-[2.5rem] sm:rounded-t-[1.8rem] flex-shrink-0">
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter">{title}</h3>
        <button onClick={onClose} className="p-3 hover:bg-gray-200 rounded-full transition-colors text-gray-900">
          <X size={28} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1 pb-20 sm:pb-6">{children}</div>
    </div>
  </div>
);

const Dashboard = () => {
  const { sales = [], products = [], consumptions = [] } = useStore();
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [activeModal, setActiveModal] = useState<'goals' | null>(null);
  const [stockThreshold, setStockThreshold] = useState(() => Number(localStorage.getItem('lt_stock_threshold')) || 10);
  const [monthlyGoal, setMonthlyGoal] = useState(() => Number(localStorage.getItem('lt_monthly_goal')) || 1000000);

  useEffect(() => {
    localStorage.setItem('lt_stock_threshold', stockThreshold.toString());
    localStorage.setItem('lt_monthly_goal', monthlyGoal.toString());
  }, [stockThreshold, monthlyGoal]);

  const setQuickRange = (type: 'MES' | '3MESES' | 'AÑO' | 'TODO') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    if (type === 'MES') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = now; }
    else if (type === '3MESES') { end = new Date(now.getFullYear(), now.getMonth(), 0); start = new Date(now.getFullYear(), now.getMonth() - 3, 1); }
    else if (type === 'AÑO') { start = new Date(now.getFullYear(), 0, 1); end = now; }
    else { setStartDate(''); setEndDate(''); return; }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const { metrics, topClients, topVarieties, usageData, goalProgress } = useMemo(() => {
    const filteredSales = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      const matchesDate = (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
      const matchesVar = selectedVarieties.length === 0 || s.items.some(i => selectedVarieties.includes(i.id));
      return matchesDate && matchesVar;
    });

    const filteredConsumptions = consumptions.filter(c => {
      const consDate = c.date.split('T')[0];
      const matchesDate = (!startDate || consDate >= startDate) && (!endDate || consDate <= endDate);
      const matchesVar = selectedVarieties.length === 0 || selectedVarieties.includes(c.productId);
      return matchesDate && matchesVar;
    });

    let rev = 0, cost = 0, unitsSold = 0, unitsConsumed = 0;
    const clientMap: Record<string, number> = {};
    const varietyMap: Record<string, {name: string, qty: number}> = {};

    filteredSales.forEach(s => {
      clientMap[s.clientName] = (clientMap[s.clientName] || 0) + Number(s.total);
      s.items.forEach(i => {
        if (selectedVarieties.length === 0 || selectedVarieties.includes(i.id)) {
          rev += (Number(i.appliedPrice) * Number(i.quantity));
          const p = products.find(prod => prod.id === i.id);
          cost += (Number(p?.costPrice || 0) * Number(i.quantity));
          unitsSold += Number(i.quantity);
          if (!varietyMap[i.id]) varietyMap[i.id] = { name: i.name, qty: 0 };
          varietyMap[i.id].qty += Number(i.quantity);
        }
      });
    });

    filteredConsumptions.forEach(c => {
      unitsConsumed += Number(c.quantity);
    });

    return {
      metrics: { rev, cost, unitsSold, unitsConsumed, outstanding: filteredSales.reduce((acc, s) => acc + Number(s.balance || 0), 0) },
      topClients: Object.entries(clientMap).sort((a,b) => b[1] - a[1]).slice(0, 3),
      topVarieties: Object.values(varietyMap).sort((a,b) => b.qty - a.qty),
      usageData: [
        { name: 'Ventas', value: unitsSold, color: '#111827' },
        { name: 'Consumo', value: unitsConsumed, color: '#f59e0b' }
      ],
      goalProgress: Math.min(Math.round((rev / monthlyGoal) * 100), 100)
    };
  }, [sales, products, consumptions, startDate, endDate, selectedVarieties, monthlyGoal]);

  const yearlyComparisonData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => ({
      name: month,
      Actual: sales.filter(s => { const d = new Date(s.date); return d.getMonth() === index && d.getFullYear() === currentYear; }).reduce((acc, s) => acc + Number(s.total), 0),
      Anterior: sales.filter(s => { const d = new Date(s.date); return d.getMonth() === index && d.getFullYear() === currentYear - 1; }).reduce((acc, s) => acc + Number(s.total), 0)
    }));
  }, [sales]);

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-10 pb-24 bg-white min-h-screen text-gray-900">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">Dashboard</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] mt-2 italic">La Tostadora - Business Intelligence</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
          {['MES', '3MESES', 'AÑO', 'TODO'].map((type) => (
            <button key={type} onClick={() => setQuickRange(type as any)} className="px-4 py-3 bg-gray-100 rounded-2xl font-black text-[10px] sm:text-xs hover:bg-gray-900 hover:text-white transition-all active:scale-95">{type}</button>
          ))}
        </div>
      </div>

      {/* METAS Y UTILIDAD - REDISEÑO MINIMALISTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border-2 border-gray-100 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] mb-4">
                  <Target size={18} className="text-amber-500" />
                  Rendimiento de Ventas
                </div>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-5xl sm:text-7xl font-black tracking-tighter text-gray-900">
                    ${metrics.rev.toLocaleString()}
                  </h3>
                  <span className="text-gray-400 font-bold text-lg sm:text-2xl">/ ${monthlyGoal.toLocaleString()}</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('goals')} 
                className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 active:scale-90"
              >
                <Settings size={24}/>
              </button>
            </div>
            
            <div className="mt-10">
              <div className="flex justify-between items-end mb-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Progreso del Objetivo</p>
                  <p className="text-sm font-black text-gray-900">
                    {goalProgress >= 100 ? '¡Meta Alcanzada! 🚀' : `Faltan $${(monthlyGoal - metrics.rev).toLocaleString()} para la meta`}
                  </p>
                </div>
                <span className="text-2xl sm:text-4xl font-black text-gray-900">{goalProgress}%</span>
              </div>
              
              {/* BARRA DE PROGRESO SLIM */}
              <div className="w-full h-3 sm:h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                <div 
                  className="h-full bg-gray-900 transition-all duration-1000 ease-out rounded-full" 
                  style={{ width: `${goalProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-4 border-gray-900 flex flex-col justify-center items-center text-center text-white">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Utilidad Neta Est.</p>
          <h3 className="text-4xl sm:text-5xl font-black tracking-tighter">${(metrics.rev - metrics.cost).toLocaleString()}</h3>
          <div className="mt-4 px-4 py-2 bg-white/10 rounded-2xl border border-white/5">
             <span className="text-amber-400 font-black text-sm uppercase italic">Margen: {metrics.rev > 0 ? Math.round(((metrics.rev - metrics.cost)/metrics.rev)*100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* ANÁLISIS DE CONSUMO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-gray-100 lg:col-span-2 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-1/2 h-48">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 text-center">Uso de Producto</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={usageData} 
                  innerRadius={50} 
                  outerRadius={70} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {usageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full sm:w-1/2 space-y-4">
             <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 font-black text-sm"><div className="w-3 h-3 bg-gray-900 rounded-full"></div> Vendido</div>
                <span className="font-black text-lg">{metrics.unitsSold} <span className="text-[10px] text-gray-400">UN.</span></span>
             </div>
             <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 font-black text-sm text-amber-600"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Consumo</div>
                <span className="font-black text-lg text-amber-600">{metrics.unitsConsumed} <span className="text-[10px] text-amber-400 font-bold">UN.</span></span>
             </div>
             <p className="text-[10px] font-bold text-gray-400 uppercase italic">Consumo interno: {metrics.unitsSold > 0 ? Math.round((metrics.unitsConsumed / (metrics.unitsSold + metrics.unitsConsumed)) * 100) : 0}% de la salida.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-gray-100 flex flex-col justify-center">
            <Package className="text-blue-500 mb-2" size={32} />
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Unidades Vendidas</p>
            <h4 className="text-3xl font-black">{metrics.unitsSold.toLocaleString()}</h4>
        </div>

        <div className="bg-red-50 p-6 rounded-[2rem] shadow-md border-2 border-red-100 flex flex-col justify-center">
            <Utensils className="text-red-600 mb-2" size={32} />
            <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Stock Crítico</p>
            <h4 className="text-3xl font-black text-red-600">{products.filter(p => p.stock <= stockThreshold).length}</h4>
        </div>
      </div>

      {/* PODIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-4 border-gray-900">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Crown className="text-amber-500" size={28}/>
            <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-gray-900">Top 3 Clientes</h3>
          </div>
          <div className="space-y-3">
            {topClients.map(([name, total], idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className={`text-xl font-black ${idx === 0 ? 'text-amber-500' : 'text-gray-400'}`}>#{idx + 1}</span>
                  <span className="font-bold text-sm sm:text-base text-gray-900 truncate max-w-[150px]">{name}</span>
                </div>
                <span className="font-black text-base sm:text-xl text-gray-900">${total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-4 border-gray-900">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Trophy className="text-gray-900" size={28}/>
            <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-gray-900">Variedades Estrella</h3>
          </div>
          <div className="space-y-4">
            {topVarieties.slice(0, 5).map((v, idx) => (
              <div key={idx} className="flex items-center justify-between border-b-2 border-gray-50 pb-2">
                <div className="flex items-center gap-3 font-bold text-gray-800">
                  <span className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-[10px]">{idx + 1}</span>
                  {v.name}
                </div>
                <span className="font-black text-gray-900">{v.qty} <span className="text-[10px] text-gray-400">UN.</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TENDENCIA ANUAL */}
      <div className="bg-white p-4 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-2 border-gray-100">
        <h3 className="text-xl sm:text-2xl font-black tracking-tighter mb-6 text-center sm:text-left uppercase">Comparativa Interanual</h3>
        <div className="h-60 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyComparisonData}>
              <defs><linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#000" stopOpacity={0.1}/><stop offset="95%" stopColor="#000" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000', fontWeight: 'bold', fontSize: 10}} />
              <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
              <Area type="monotone" dataKey="Actual" stroke="#000" strokeWidth={4} fill="url(#colorAct)" />
              <Area type="monotone" dataKey="Anterior" stroke="#e5e7eb" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODAL CONFIG */}
      {activeModal === 'goals' && (
        <Modal title="Configurar Metas y Alertas" onClose={() => setActiveModal(null)}>
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-gray-100">
              <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Meta Mensual de Facturación ($)</label>
              <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(Number(e.target.value))} className="w-full p-4 text-3xl font-black bg-white border-4 border-gray-900 rounded-2xl outline-none" />
            </div>
            <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100">
              <label className="text-[10px] font-black uppercase text-amber-600 mb-2 block tracking-widest">Umbral de Reposición (Stock)</label>
              <input type="number" value={stockThreshold} onChange={(e) => setStockThreshold(Number(e.target.value))} className="w-full p-4 text-2xl font-black bg-white border-2 border-amber-900 rounded-2xl outline-none" />
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all uppercase tracking-widest">Confirmar Ajustes</button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;
