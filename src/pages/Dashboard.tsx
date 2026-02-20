import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { DollarSign, Package, ShoppingBag, TrendingUp, X, Settings, Coffee, ShoppingCart, Award, List, Wallet, User as UserIcon, Calendar, Filter, ChevronDown, CheckSquare, Square, Target, Trophy, Medal, Crown } from 'lucide-react';

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
  const { sales = [], products = [] } = useStore();
  
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

  const { metrics, topClients, topVarieties } = useMemo(() => {
    const filtered = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      const matchesDate = (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
      const matchesVar = selectedVarieties.length === 0 || s.items.some(i => selectedVarieties.includes(i.id));
      return matchesDate && matchesVar;
    });

    let rev = 0, cost = 0, units = 0;
    const clientMap: Record<string, number> = {};
    const varietyMap: Record<string, {name: string, qty: number}> = {};

    filtered.forEach(s => {
      clientMap[s.clientName] = (clientMap[s.clientName] || 0) + Number(s.total);
      s.items.forEach(i => {
        if (selectedVarieties.length === 0 || selectedVarieties.includes(i.id)) {
          rev += (Number(i.appliedPrice) * Number(i.quantity));
          const p = products.find(prod => prod.id === i.id);
          cost += (Number(p?.costPrice || 0) * Number(i.quantity));
          units += Number(i.quantity);
          if (!varietyMap[i.id]) varietyMap[i.id] = { name: i.name, qty: 0 };
          varietyMap[i.id].qty += Number(i.quantity);
        }
      });
    });

    return {
      metrics: { rev, cost, units, outstanding: filtered.reduce((acc, s) => acc + Number(s.balance || 0), 0) },
      topClients: Object.entries(clientMap).sort((a,b) => b[1] - a[1]).slice(0, 3),
      topVarieties: Object.values(varietyMap).sort((a,b) => b.qty - a.qty)
    };
  }, [sales, products, startDate, endDate, selectedVarieties]);

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
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">La Tostadora</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] mt-2">Panel de Control General</p>
        </div>
        
        {/* BOTONES DE TIEMPO (Se ajustan en móvil) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto">
          {['MES', '3MESES', 'AÑO', 'TODO'].map((type) => (
            <button 
              key={type}
              onClick={() => setQuickRange(type as any)} 
              className="px-4 py-3 bg-gray-100 rounded-2xl font-black text-[10px] sm:text-xs hover:bg-gray-900 hover:text-white transition-all active:scale-95"
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* FILTROS (Se apilan en móvil) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-gray-100">
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-gray-100 overflow-hidden">
          <Calendar className="text-gray-400 shrink-0" size={20} />
          <div className="flex items-center gap-1 flex-1 font-black text-sm">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent focus:outline-none" />
            <span className="text-gray-300">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent focus:outline-none" />
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowVarietyDropdown(!showVarietyDropdown)} className="w-full flex justify-between items-center p-3 sm:p-4 bg-white rounded-2xl border-2 border-gray-100 font-black text-sm">
            <div className="flex items-center gap-2"><Coffee size={18}/> {selectedVarieties.length || 'Todas'} Variedades</div>
            <ChevronDown size={18}/>
          </button>
          {showVarietyDropdown && (
            <div className="absolute top-full w-full mt-2 bg-white border-4 border-gray-900 rounded-[2rem] shadow-2xl z-[110] p-4 space-y-2 max-h-60 overflow-y-auto">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer font-bold active:bg-gray-100">
                  <input type="checkbox" className="hidden" checked={selectedVarieties.includes(p.id)} onChange={() => setSelectedVarieties(prev => prev.includes(p.id) ? prev.filter(v => v !== p.id) : [...prev, p.id])} />
                  {selectedVarieties.includes(p.id) ? <CheckSquare size={24} className="text-gray-900"/> : <Square size={24} className="text-gray-200"/>}
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PODIOS (Layout flexible) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* PODIO CLIENTES */}
        <div className="bg-gray-900 text-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Crown className="text-amber-400" size={28}/>
            <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic">Top 3 Clientes</h3>
          </div>
          <div className="space-y-3">
            {topClients.map(([name, total], idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/10 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className={`text-xl font-black ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : 'text-orange-400'}`}>#{idx + 1}</span>
                  <span className="font-bold text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{name}</span>
                </div>
                <span className="font-black text-base sm:text-xl text-amber-50">${total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PODIO VARIEDADES */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-4 border-gray-900">
          <div className="flex items-center gap-3 mb-6 sm:mb-8">
            <Trophy className="text-gray-900" size={28}/>
            <h3 className="text-xl sm:text-2xl font-black tracking-tighter uppercase italic text-gray-900">Variedades</h3>
          </div>
          <div className="space-y-4">
            {topVarieties.slice(0, 5).map((v, idx) => (
              <div key={idx} className="flex items-center justify-between border-b-2 border-gray-50 pb-2">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-[10px]">{idx + 1}</span>
                  <span className="font-bold text-gray-800 text-sm sm:text-base">{v.name}</span>
                </div>
                <span className="font-black text-gray-900 text-sm sm:text-base">{v.qty} <span className="text-[10px] text-gray-400">UN.</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* METAS Y RENTABILIDAD (Mejorado para móvil) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 bg-amber-500 p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-4 border-gray-900">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter uppercase">Ventas vs Objetivo</h3>
            <button onClick={() => setActiveModal('goals')} className="p-2 bg-gray-900 rounded-full text-white active:scale-90"><Settings size={20}/></button>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 mb-6">
            <h4 className="text-5xl sm:text-7xl font-black text-gray-900 tracking-tighter leading-none">${metrics.rev.toLocaleString()}</h4>
            <span className="font-black text-gray-900 text-xs sm:text-sm bg-gray-900/10 px-3 py-1 rounded-full border border-gray-900/20">META: ${monthlyGoal.toLocaleString()}</span>
          </div>
          <div className="w-full h-8 sm:h-10 bg-gray-900/10 rounded-full border-4 border-gray-900 overflow-hidden">
            <div className="h-full bg-gray-900 transition-all duration-1000 shadow-[0_0_20px_rgba(0,0,0,0.3)]" style={{ width: `${Math.min((metrics.rev/monthlyGoal)*100, 100)}%` }}></div>
          </div>
        </div>
        
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-4 border-gray-100 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Utilidad Estimada</p>
          <h3 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tighter">${(metrics.rev - metrics.cost).toLocaleString()}</h3>
          <div className="mt-4 px-4 py-2 bg-green-100 rounded-2xl">
             <span className="text-green-700 font-black text-sm">Rentabilidad: {metrics.rev > 0 ? Math.round(((metrics.rev - metrics.cost)/metrics.rev)*100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* GRÁFICO (Oculto en pantallas muy pequeñas o con scroll) */}
      <div className="bg-white p-4 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border-2 border-gray-100">
        <h3 className="text-xl sm:text-2xl font-black tracking-tighter mb-6 sm:mb-8 text-center sm:text-left">Tendencia Anual</h3>
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

      {/* MODAL CONFIG (Ajustado para el pulgar en móvil) */}
      {activeModal === 'goals' && (
        <Modal title="Configurar App" onClose={() => setActiveModal(null)}>
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-gray-100">
              <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block tracking-widest">Meta de Venta del Mes ($)</label>
              <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(Number(e.target.value))} className="w-full p-4 text-3xl font-black bg-white border-4 border-gray-900 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/20" />
            </div>
            <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100">
              <label className="text-[10px] font-black uppercase text-amber-600 mb-2 block tracking-widest">Alerta Stock Bajo (Unidades)</label>
              <input type="number" value={stockThreshold} onChange={(e) => setStockThreshold(Number(e.target.value))} className="w-full p-4 text-2xl font-black bg-white border-2 border-amber-900 rounded-2xl outline-none" />
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all">GUARDAR CAMBIOS</button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;
