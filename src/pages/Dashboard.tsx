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
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-gray-900">
    <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col border-4 border-gray-900`}>
      <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-[1.8rem] flex-shrink-0">
        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-900">
          <X size={28} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
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

  // NUEVA LÓGICA DE RANGO DE FECHAS CALENDARIO
  const setQuickRange = (type: 'MES' | '3MESES' | 'AÑO' | 'TODO') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'MES') {
      // Del día 1 de este mes a hoy
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    } else if (type === '3MESES') {
      // 3 meses completos anteriores (Ej: si es Feb: Nov, Dic, Ene)
      end = new Date(now.getFullYear(), now.getMonth(), 0); // Último día del mes pasado
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (type === 'AÑO') {
      // Del 1 de enero de este año a hoy
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
    } else {
      setStartDate('');
      setEndDate('');
      return;
    }

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
      // Acumular por cliente
      clientMap[s.clientName] = (clientMap[s.clientName] || 0) + Number(s.total);
      
      s.items.forEach(i => {
        if (selectedVarieties.length === 0 || selectedVarieties.includes(i.id)) {
          rev += (Number(i.appliedPrice) * Number(i.quantity));
          const p = products.find(prod => prod.id === i.id);
          cost += (Number(p?.costPrice || 0) * Number(i.quantity));
          units += Number(i.quantity);
          
          // Acumular por variedad
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
    <div className="p-4 md:p-8 space-y-8 pb-24 bg-white min-h-screen text-gray-900">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tighter">La Tostadora</h2>
          <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.2em]">Panel de Control</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setQuickRange('MES')} className="px-5 py-2.5 bg-gray-100 rounded-2xl font-black text-xs hover:bg-gray-900 hover:text-white transition-all">MES</button>
          <button onClick={() => setQuickRange('3MESES')} className="px-5 py-2.5 bg-gray-100 rounded-2xl font-black text-xs hover:bg-gray-900 hover:text-white transition-all">3 MESES</button>
          <button onClick={() => setQuickRange('AÑO')} className="px-5 py-2.5 bg-gray-100 rounded-2xl font-black text-xs hover:bg-gray-900 hover:text-white transition-all">AÑO</button>
          <button onClick={() => setQuickRange('TODO')} className="px-5 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-xs">TODO</button>
        </div>
      </div>

      {/* FILTROS MANUALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-[2.5rem] border-2 border-gray-100">
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-gray-100">
          <Calendar className="text-gray-400" size={24} />
          <div className="flex items-center gap-2 flex-1 font-black">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-transparent outline-none" />
            <span>-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-transparent outline-none" />
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowVarietyDropdown(!showVarietyDropdown)} className="w-full flex justify-between items-center p-4 bg-white rounded-2xl border-2 border-gray-100 font-black">
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
      </div>

      {/* PODIOS (NUEVO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PODIO CLIENTES */}
        <div className="bg-gray-900 text-white p-8 rounded-[3rem] shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <Crown className="text-amber-400" size={32}/>
            <h3 className="text-2xl font-black tracking-tighter">Top 3 Clientes</h3>
          </div>
          <div className="space-y-4">
            {topClients.map(([name, total], idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/10 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-black ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : 'text-orange-400'}`}>#{idx + 1}</span>
                  <span className="font-bold text-lg">{name}</span>
                </div>
                <span className="font-black text-xl">${total.toLocaleString()}</span>
              </div>
            ))}
            {topClients.length === 0 && <p className="text-gray-500 font-bold">Sin datos en este rango.</p>}
          </div>
        </div>

        {/* PODIO VARIEDADES */}
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-gray-900">
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="text-gray-900" size={32}/>
            <h3 className="text-2xl font-black tracking-tighter text-gray-900">Variedades más vendidas</h3>
          </div>
          <div className="space-y-4">
            {topVarieties.slice(0, 5).map((v, idx) => (
              <div key={idx} className="flex items-center justify-between border-b-2 border-gray-50 pb-2">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-xs">{idx + 1}</span>
                  <span className="font-bold text-gray-800">{v.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-gray-900">{v.qty} unid.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* METAS Y UTILIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-amber-500 p-8 rounded-[3rem] shadow-xl border-4 border-gray-900">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Progreso de Ventas</h3>
            <button onClick={() => setActiveModal('goals')} className="p-2 bg-gray-900 rounded-full text-white"><Settings size={20}/></button>
          </div>
          <div className="flex justify-between items-end mb-4">
            <h4 className="text-6xl font-black text-gray-900 tracking-tighter">${metrics.rev.toLocaleString()}</h4>
            <span className="font-black text-gray-900 text-xl">OBJETIVO: ${monthlyGoal.toLocaleString()}</span>
          </div>
          <div className="w-full h-8 bg-gray-900/10 rounded-full border-4 border-gray-900 overflow-hidden">
            <div className="h-full bg-gray-900 transition-all duration-1000" style={{ width: `${Math.min((metrics.rev/monthlyGoal)*100, 100)}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-gray-100 flex flex-col justify-center">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Utilidad Estimada</p>
          <h3 className="text-5xl font-black text-gray-900 tracking-tighter">${(metrics.rev - metrics.cost).toLocaleString()}</h3>
          <p className="text-green-600 font-black mt-2">RENTABILIDAD: {metrics.rev > 0 ? Math.round(((metrics.rev - metrics.cost)/metrics.rev)*100) : 0}%</p>
        </div>
      </div>

      {/* COMPARATIVA ANUAL */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black tracking-tighter">Ventas: Actual vs Año Anterior</h3>
          <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-900 rounded-full"></div> Actual</span>
            <span className="flex items-center gap-1 text-gray-300"><div className="w-3 h-3 bg-gray-200 rounded-full"></div> Anterior</span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyComparisonData}>
              <defs><linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#000" stopOpacity={0.1}/><stop offset="95%" stopColor="#000" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000', fontWeight: 'bold', fontSize: 10}} />
              <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
              <Area type="monotone" dataKey="Actual" stroke="#000" strokeWidth={5} fill="url(#colorAct)" />
              <Area type="monotone" dataKey="Anterior" stroke="#e5e7eb" strokeWidth={3} fill="transparent" strokeDasharray="8 8" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODAL CONFIG */}
      {activeModal === 'goals' && (
        <Modal title="Configurar Metas" onClose={() => setActiveModal(null)}>
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-100">
              <label className="text-xs font-black uppercase text-gray-400 mb-2 block">Meta de Venta Mensual ($)</label>
              <input type="number" value={monthlyGoal} onChange={(e) => setMonthlyGoal(Number(e.target.value))} className="w-full p-4 text-3xl font-black bg-white border-4 border-gray-900 rounded-2xl outline-none" />
            </div>
            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-100">
              <label className="text-xs font-black uppercase text-amber-600 mb-2 block">Umbral de Alerta Stock</label>
              <input type="number" value={stockThreshold} onChange={(e) => setStockThreshold(Number(e.target.value))} className="w-full p-4 text-2xl font-black bg-white border-2 border-amber-900 rounded-2xl outline-none" />
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xl hover:scale-95 transition-all">GUARDAR CAMBIOS</button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;
