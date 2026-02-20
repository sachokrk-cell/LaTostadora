import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Package, ShoppingBag, TrendingUp, X, Settings, Coffee, ShoppingCart, Award, List, Wallet, User as UserIcon, Calendar, Filter, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { Sale } from '../types';

interface ModalProps {
  title: string;
  children?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

const Modal = ({ title, children, onClose, maxWidth = 'max-w-2xl' }: ModalProps) => (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
    <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col border-4 border-gray-900`}>
      <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-[1.8rem] flex-shrink-0">
        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-900">
          <X size={28} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1 text-gray-900">
        {children}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { sales = [], products = [] } = useStore();
  
  // ESTADOS DE FILTROS
  const [activeModal, setActiveModal] = useState<'sales' | 'soldItems' | 'stock' | 'topProduct' | 'products' | 'outstanding' | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>([]);
  const [showVarietyDropdown, setShowVarietyDropdown] = useState(false);
  const [stockThreshold, setStockThreshold] = useState(() => Number(localStorage.getItem('coffeemaster_stock_threshold')) || 10);

  useEffect(() => {
    localStorage.setItem('coffeemaster_stock_threshold', stockThreshold.toString());
  }, [stockThreshold]);

  // FUNCIONES DE RANGO RÁPIDO
  const setQuickRange = (months: number | 'all') => {
    const end = new Date();
    const start = new Date();
    if (months === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      start.setMonth(start.getMonth() - months);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // LÓGICA DE FILTRADO Y MÉTRICAS
  const { metrics, lowStockProducts } = useMemo(() => {
    const filtered = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      const matchesStart = startDate ? saleDate >= startDate : true;
      const matchesEnd = endDate ? saleDate <= endDate : true;
      
      const matchesVariety = selectedVarieties.length > 0 
        ? s.items.some(item => selectedVarieties.includes(item.id)) 
        : true;

      return matchesStart && matchesEnd && matchesVariety;
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnits = 0;

    filtered.forEach(s => {
      s.items.forEach(item => {
        if (selectedVarieties.length === 0 || selectedVarieties.includes(item.id)) {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.appliedPrice) || 0;
          const originalProduct = products.find(p => p.id === item.id);
          const cost = Number(originalProduct?.costPrice || 0);

          totalRevenue += (price * qty);
          totalCost += (cost * qty);
          totalUnits += qty;
        }
      });
    });

    const totalOutstanding = filtered.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);
    const lowStock = products.filter(p => Number(p.stock) <= stockThreshold);

    return {
      metrics: { totalRevenue, totalCost, totalUnits, totalOutstanding, lowStockCount: lowStock.length },
      lowStockProducts: lowStock
    };
  }, [sales, products, startDate, endDate, selectedVarieties, stockThreshold]);

  const chartData = useMemo(() => {
    const data = [];
    for(let i=5; i>=0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('es-ES', { month: 'short' });
        const monthVentas = sales.filter(s => {
          const sd = new Date(s.date);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        }).reduce((acc, s) => acc + Number(s.total), 0);
        data.push({ name: monthName, Ventas: monthVentas });
    }
    return data;
  }, [sales]);

  const toggleVariety = (id: string) => {
    setSelectedVarieties(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-24 bg-gray-50 min-h-screen">
      
      {/* HEADER Y FILTROS */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Panel de Control</h2>
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Estadísticas de La Tostadora</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setQuickRange(1)} className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-black text-xs hover:border-gray-900 transition-all">MES</button>
              <button onClick={() => setQuickRange(3)} className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-black text-xs hover:border-gray-900 transition-all">3 MESES</button>
              <button onClick={() => setQuickRange(12)} className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl font-black text-xs hover:border-gray-900 transition-all">AÑO</button>
              <button onClick={() => setQuickRange('all')} className="px-4 py-2 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all">HISTÓRICO</button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <div className="flex items-center gap-2 flex-1">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 font-bold text-gray-900" />
              <span className="font-black text-gray-300">/</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border border-gray-200 font-bold text-gray-900" />
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowVarietyDropdown(!showVarietyDropdown)}
              className="w-full flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-200 font-bold text-gray-900"
            >
              <div className="flex items-center gap-2">
                <Coffee size={18} className="text-gray-400" />
                <span>{selectedVarieties.length === 0 ? "Todas las variedades" : `${selectedVarieties.length} seleccionadas`}</span>
              </div>
              <ChevronDown size={18} />
            </button>
            
            {showVarietyDropdown && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border-2 border-gray-900 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2">
                {products.map(p => (
                  <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={selectedVarieties.includes(p.id)}
                      onChange={() => toggleVariety(p.id)}
                    />
                    {selectedVarieties.includes(p.id) ? <CheckSquare className="text-gray-900" /> : <Square className="text-gray-300" />}
                    <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => { setStartDate(''); setEndDate(''); setSelectedVarieties([]); }}
            className="flex items-center justify-center gap-2 bg-red-50 text-red-600 font-black rounded-lg hover:bg-red-100 transition-colors py-2"
          >
            <X size={18} /> LIMPIAR FILTROS
          </button>
        </div>
      </div>
      
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border-b-8 border-amber-500">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Ventas Totales</p>
          <h3 className="text-4xl font-black text-gray-900">${metrics.totalRevenue.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 w-fit px-3 py-1 rounded-full text-xs font-black">
            <TrendingUp size={14} /> INGRESOS BRUTOS
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl border-b-8 border-green-600">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Costo Acumulado</p>
          <h3 className="text-4xl font-black text-gray-900">${metrics.totalCost.toLocaleString()}</h3>
          <p className="mt-2 text-xs font-black text-green-700 uppercase tracking-tighter">
            Utilidad: ${(metrics.totalRevenue - metrics.totalCost).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-xl border-b-8 border-blue-500">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Unidades Vendidas</p>
          <h3 className="text-4xl font-black text-gray-900">{metrics.totalUnits}</h3>
          <div className="mt-4 flex items-center gap-2 text-blue-600 bg-blue-50 w-fit px-3 py-1 rounded-full text-xs font-black">
            <ShoppingBag size={14} /> PAQUETES / UNID.
          </div>
        </div>

        <div onClick={() => setActiveModal('stock')} className="bg-white p-6 rounded-[2rem] shadow-xl border-b-8 border-red-500 cursor-pointer hover:scale-105 transition-transform">
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Alertas Stock</p>
          <h3 className="text-4xl font-black text-gray-900">{metrics.lowStockCount}</h3>
          <p className="mt-2 text-xs font-black text-red-600 uppercase">Debes reponer productos</p>
        </div>
      </div>

      {/* GRÁFICO TENDENCIA */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Tendencia de Ingresos (Histórico)</h3>
          <div className="p-3 bg-gray-900 rounded-2xl text-white"><TrendingUp size={24} /></div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000', fontWeight: 'bold'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#000', fontWeight: 'bold'}} />
              <Tooltip 
                cursor={{fill: '#f8f8f8'}}
                contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '1rem'}}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ventas']}
              />
              <Bar dataKey="Ventas" radius={[10, 10, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 5 ? '#000' : '#d1d5db'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MODAL STOCK */}
      {activeModal === 'stock' && (
        <Modal title="Alertas de Reposición" onClose={() => setActiveModal(null)}>
          <div className="space-y-6 text-gray-900 font-bold">
            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-200 flex justify-between items-center">
              <div>
                <p className="font-black text-amber-900 text-lg">Umbral de Alerta</p>
                <p className="text-xs text-amber-700 uppercase">Avisar cuando quede menos de:</p>
              </div>
              <input 
                type="number" 
                value={stockThreshold} 
                onChange={(e) => setStockThreshold(Number(e.target.value))}
                className="w-24 p-3 border-2 border-amber-300 rounded-xl text-center font-black text-2xl bg-white"
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-4 bg-white border-2 border-red-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-black italic">!</div>
                    <div>
                      <p className="font-black text-gray-900 text-lg">{p.name}</p>
                      <p className="text-xs text-gray-500 uppercase">Costo Reposición: ${p.costPrice}</p>
                    </div>
                  </div>
                  <span className="bg-red-600 text-white px-4 py-2 rounded-xl text-lg font-black">{p.stock} UN.</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Dashboard;
