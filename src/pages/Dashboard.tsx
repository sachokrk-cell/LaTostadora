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
  <div className="fixed inset-0 bg-[#1C1C1C]/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in text-[#1C1C1C]">
    <div className={`bg-[#E8DFC8] rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full ${maxWidth} max-h-[95vh] sm:max-h-[90vh] flex flex-col border-t-4 sm:border-4 border-[#6B7A3A]`}>
      <div className="p-6 border-b border-[#6B7A3A]/20 flex justify-between items-center bg-[#E8DFC8] rounded-t-[2.5rem] sm:rounded-t-[1.8rem] flex-shrink-0">
        <h3 className="text-xl sm:text-2xl font-black text-[#1C1C1C] tracking-tighter uppercase">{title}</h3>
        <button onClick={onClose} className="p-3 hover:bg-[#6B7A3A]/10 rounded-full transition-colors text-[#1C1C1C]">
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
        { name: 'Ventas', value: unitsSold, color: '#1C1C1C' },
        { name: 'Consumo', value: unitsConsumed, color: '#6B7A3A' }
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
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-10 pb-24 bg-[#E8DFC8] min-h-screen text-[#1C1C1C]">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none uppercase">Dashboard</h2>
          <p className="text-[#6B7A3A] font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] mt-2 italic">La Tostadora - Business Intelligence</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
          {['MES', '3MESES', 'AÑO', 'TODO'].map((type) => (
            <button 
              key={type} 
              onClick={() => setQuickRange(type as any)} 
              className="px-4 py-3 bg-[#1C1C1C] text-[#E8DFC8] rounded-2xl font-black text-[10px] sm:text-xs hover:bg-[#6B7A3A] transition-all active:scale-95"
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* METAS Y UTILIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/50 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border-2 border-[#6B7A3A]/20 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-[#6B7A3A] font-black uppercase text-[10px] tracking-[0.2em] mb-4">
                  <Target size={18} />
                  Objetivo Mensual
                </div>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-5xl sm:text-7xl font-black tracking-tighter text-[#1C1C1C]">
                    ${metrics.rev.toLocaleString()}
                  </h3>
                  <span className="text-[#6B7A3A] font-bold text-lg sm:text-2xl">/ ${monthlyGoal.toLocaleString()}</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('goals')} 
                className="p-3 bg-[#6B7A3A] text-[#E8DFC8] rounded-2xl transition-all shadow-md active:scale-90"
              >
                <Settings size={24}/>
              </button>
            </div>
            
            <div className="mt-10">
              <div className="flex justify-between items-end mb-3 font-black">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-[#6B7A3A] tracking-widest">Estado del Tostado</p>
                  <p className="text-sm">
                    {goalProgress >= 100 ? '¡Meta Lograda! ☕' : `Faltan $${(monthlyGoal - metrics.rev).toLocaleString()}`}
                  </p>
                </div>
                <span className="text-2xl sm:text-4xl text-[#1C1C1C]">{goalProgress}%</span>
              </div>
              <div className="w-full h-3 sm:h-4 bg-[#1C1C1C]/10 rounded-full overflow-hidden border border-[#1C1C1C]/5">
                <div 
                  className="h-full bg-[#6B7A3A] transition-all duration-1000 ease-out rounded-full" 
                  style={{ width: `${goalProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#1C1C1C] p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl flex flex-col justify-center items-center text-center text-[#E8DFC8]">
          <p className="text-[10px] font-black text-[#6B7A3A] uppercase tracking-[0.2em] mb-2">Utilidad Estimada</p>
          <h3 className="text-4xl sm:text-5xl font-black tracking-tighter">${(metrics.rev - metrics.cost).toLocaleString()}</h3>
          <div className="mt-4 px-4 py-2 bg-[#6B7A3A]/20 rounded-2xl border border-[#6B7A3A]/30">
             <span className="text-[#6B7A3A] font-black text-sm uppercase italic">Margen: {metrics.rev > 0 ? Math.round(((metrics.rev - metrics.cost)/metrics.rev)*100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* ANÁLISIS DE CONSUMO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/40 p-6 rounded-[2rem] shadow-sm border-2 border-[#6B7A3A]/10 lg:col-span-2 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-1/2 h-48">
            <h4 className="text-xs font-black uppercase text-[#6B7A3A] tracking-widest mb-2 text-center underline decoration-[#5A3E2B]">Uso de Grano</h4>
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
             <div className="flex items-center justify-between border-b border-[#6B7A3A]/10 pb-2">
                <div className="flex items-center gap-2 font-black text-sm"><div className="w-3 h-3 bg-[#1C1C1C] rounded-full"></div> Vendido</div>
                <span className="font-black text-lg">{metrics.unitsSold} UN.</span>
             </div>
             <div className="flex items-center justify-between border-b border-[#6B7A3A]/10 pb-2 text-[#6B7A3A]">
                <div className="flex items-center gap-2 font-black text-sm"><div className="w-3 h-3 bg-[#6B7A3A] rounded-full"></div> Consumo</div>
                <span className="font-black text-lg">{metrics.unitsConsumed} UN.</span>
             </div>
          </div>
        </div>

        <div className="bg-[#E8DFC8] p-6 rounded-[2rem] shadow-inner border-2 border-[#1C1C1C]/10 flex flex-col justify-center items-center">
            <ShoppingBag className="text-[#5A3E2B] mb-2" size={32} />
            <p className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest">Unidades</p>
            <h4 className="text-3xl font-black">{metrics.unitsSold.toLocaleString()}</h4>
        </div>

        <div className="bg-[#5A3E2B]/10 p-6 rounded-[2rem] border-2 border-[#5A3E2B]/20 flex flex-col justify-center items-center">
            <Utensils className="text-[#5A3E2B] mb-2" size={32} />
            <p className="text-[10px] font-black uppercase text-[#5A3E2B] tracking-widest text-center">Stock Crítico</p>
            <h4 className="text-3xl font-black text-[#5A3E2B]">{products.filter(p => p.stock <= stockThreshold).length}</h4>
        </div>
      </div>

      {/* PODIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-[#1C1C1C] p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl text-[#E8DFC8]">
          <div className="flex items-center gap-3 mb-6 sm:mb-8 border-l-4 border-[#6B7A3A] pl-4">
            <Crown className="text-[#6B7A3A]" size={28}/>
            <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic">Ranking Clientes</h3>
          </div>
          <div className="space-y-3">
            {topClients.map(([name, total], idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#E8DFC8]/5 p-4 rounded-2xl border border-[#E8DFC8]/10 hover:bg-[#6B7A3A]/20 transition-all">
                <div className="flex items-center gap-3 font-black">
                  <span className={`text-xl ${idx === 0 ? 'text-[#6B7A3A]' : 'text-gray-500'}`}>#{idx + 1}</span>
                  <span className="text-sm sm:text-base">{name}</span>
                </div>
                <span className="font-black text-base sm:text-xl text-[#6B7A3A]">${total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/60 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border-2 border-[#6B7A3A]/20">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Trophy className="text-[#5A3E2B]" size={28}/>
            <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-[#1C1C1C]">Variedades Estrella</h3>
          </div>
          <div className="space-y-4">
            {topVarieties.slice(0, 5).map((v, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-[#6B7A3A]/10 pb-2">
                <div className="flex items-center gap-3 font-bold text-[#1C1C1C]">
                  <span className="w-7 h-7 rounded-full bg-[#6B7A3A] text-[#E8DFC8] flex items-center justify-center font-black text-[10px]">{idx + 1}</span>
                  {v.name}
                </div>
                <span className="font-black text-[#1C1C1C]">{v.qty} <span className="text-[10px] text-[#6B7A3A]">UN.</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TENDENCIA */}
      <div className="bg-white/30 p-4 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-sm border-2 border-[#6B7A3A]/10">
        <h3 className="text-xl sm:text-2xl font-black tracking-tighter mb-6 text-center sm:text-left uppercase text-[#1C1C1C]">Comparativa de Cosechas</h3>
        <div className="h-60 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyComparisonData}>
              <defs>
                <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B7A3A" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6B7A3A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#6B7A3A" strokeOpacity={0.1} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#1C1C1C', fontWeight: 'bold', fontSize: 10}} />
              <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', backgroundColor: '#E8DFC8', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
              <Area type="monotone" dataKey="Actual" stroke="#6B7A3A" strokeWidth={4} fill="url(#colorAct)" />
              <Area type="monotone" dataKey="Anterior" stroke="#5A3E2B" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
