import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Search, TrendingUp, ShoppingBag, DollarSign, Percent, Briefcase, History, Layers, Trash2, Edit2, X, Calendar, CheckSquare, Square, ArrowRightLeft, LineChart } from 'lucide-react';
import { Purchase } from '../types';

const ProductAnalysis = () => {
  const { products, sales, purchases, deletePurchase, updatePurchase } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Estados para Modal de Edición de Compras
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  // --- LÓGICA DE SELECCIÓN ---
  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  // --- PROCESAMIENTO DE DATOS (INDIVIDUAL Y COMPARATIVO) ---
  const analysisData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toLocaleString('es-ES', { month: 'short' }));
    }

    // Caso: Un solo producto (Análisis Profundo)
    if (selectedProductIds.length === 1) {
      const pId = selectedProductIds[0];
      let cumulativeProfit = 0;
      
      const history = months.map(m => {
        const monthSales = sales.filter(s => 
          new Date(s.date).toLocaleString('es-ES', { month: 'short' }) === m
        );
        
        let revenue = 0;
        let cogs = 0;
        let units = 0;

        monthSales.forEach(s => {
          const item = s.items.find(i => i.id === pId);
          if (item) {
            revenue += item.quantity * (item.appliedPrice || item.sellingPrice);
            cogs += item.quantity * (item.costPrice || 0);
            units += item.quantity;
          }
        });

        const profit = revenue - cogs;
        cumulativeProfit += profit;

        return { month: m, Ventas: revenue, Ganancia: profit, Acumulado: cumulativeProfit, Unidades: units };
      });

      return { mode: 'single', history };
    }

    // Caso: Comparativa (Múltiples productos)
    if (selectedProductIds.length > 1) {
      const comparison = selectedProductIds.map(pId => {
        const product = products.find(p => p.id === pId);
        let totalRev = 0;
        let totalCogs = 0;
        let totalUnits = 0;

        sales.forEach(s => {
          const item = s.items.find(i => i.id === pId);
          if (item) {
            totalRev += item.quantity * (item.appliedPrice || item.sellingPrice);
            totalCogs += item.quantity * (item.costPrice || 0);
            totalUnits += item.quantity;
          }
        });

        return {
          name: product?.name || '?',
          Ventas: totalRev,
          Ganancia: totalRev - totalCogs,
          Unidades: totalUnits,
          Margen: totalRev > 0 ? Math.round(((totalRev - totalCogs) / totalRev) * 100) : 0
        };
      });

      return { mode: 'compare', comparison };
    }

    return null;
  }, [selectedProductIds, sales, products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen text-[#1C1C1C] pb-24">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Análisis Inteligente</h2>
          <p className="text-[#6B7A3A] font-bold text-xs uppercase tracking-[0.2em]">La Tostadora - Centro de Decisiones</p>
        </div>
        {selectedProductIds.length > 0 && (
          <button 
            onClick={() => setSelectedProductIds([])}
            className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black hover:bg-[#1C1C1C] hover:text-white transition-all"
          >
            LIMPIAR SELECCIÓN ({selectedProductIds.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR: SELECTOR MULTIPLE */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar variedad..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none text-sm font-bold focus:ring-2 focus:ring-[#6B7A3A]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredProducts.map(p => (
                <button 
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 border-2 ${selectedProductIds.includes(p.id) ? 'bg-[#6B7A3A] border-[#6B7A3A] text-white' : 'bg-white border-transparent hover:border-gray-200'}`}
                >
                  {selectedProductIds.includes(p.id) ? <CheckSquare size={20}/> : <Square size={20} className="text-gray-300"/>}
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{p.name}</p>
                    <p className={`text-[10px] font-bold uppercase ${selectedProductIds.includes(p.id) ? 'text-white/70' : 'text-gray-400'}`}>{p.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ÁREA DE ANÁLISIS */}
        <div className="lg:col-span-3">
          {!analysisData ? (
            <div className="h-[500px] flex flex-col items-center justify-center text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
               <ArrowRightLeft size={48} className="text-gray-200 mb-4"/>
               <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Selecciona productos</h3>
               <p className="text-gray-400 text-sm max-w-xs mt-2">Elige una variedad para ver su rentabilidad o varias para compararlas entre sí.</p>
            </div>
          ) : analysisData.mode === 'single' ? (
            // --- VISTA INDIVIDUAL PROFUNDA ---
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1C1C1C] p-6 rounded-[2.5rem] text-[#E8DFC8]">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7A3A] mb-2">Unidades Vendidas</p>
                   <h4 className="text-4xl font-black">{analysisData.history?.reduce((acc,h) => acc + h.Unidades, 0)}</h4>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Ganancia Total</p>
                   <h4 className="text-4xl font-black text-[#1C1C1C]">${analysisData.history?.reduce((acc,h) => acc + h.Ganancia, 0).toLocaleString()}</h4>
                </div>
                <div className="bg-[#6B7A3A] p-6 rounded-[2.5rem] text-white">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Margen Promedio</p>
                   <h4 className="text-4xl font-black">
                     {Math.round((analysisData.history?.reduce((acc,h) => acc + h.Ganancia, 0) / analysisData.history?.reduce((acc,h) => acc + h.Ventas, 0)) * 100) || 0}%
                   </h4>
                </div>
              </div>

              {/* GRÁFICO DE EVOLUCIÓN Y ACUMULADO */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2 text-gray-400">
                  <LineChart size={18} className="text-[#6B7A3A]"/> Rentabilidad por Mes y Acumulada
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysisData.history}>
                      <defs>
                        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6B7A3A" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6B7A3A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                      <Legend />
                      <Area name="Ganancia Mensual" type="monotone" dataKey="Ganancia" stroke="#6B7A3A" strokeWidth={4} fill="url(#grad1)" />
                      <Area name="Rentabilidad Acumulada" type="monotone" dataKey="Acumulado" stroke="#1C1C1C" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            // --- VISTA COMPARATIVA ---
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#1C1C1C] p-8 rounded-[3rem] text-white">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-[#6B7A3A]">Comparativa de Ventas vs Ganancia</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData.comparison}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#fff', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#fff', fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '1rem', color: '#000'}} />
                      <Legend />
                      <Bar name="Ventas ($)" dataKey="Ventas" fill="#6B7A3A" radius={[10, 10, 0, 0]} />
                      <Bar name="Ganancia ($)" dataKey="Ganancia" fill="#E8DFC8" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysisData.comparison?.map((prod, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 flex justify-between items-center">
                    <div>
                      <p className="font-black text-lg leading-none mb-1">{prod.name}</p>
                      <p className="text-[10px] font-bold text-[#6B7A3A] uppercase tracking-widest">{prod.Unidades} Unidades vendidas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#1C1C1C]">${prod.Ganancia.toLocaleString()}</p>
                      <span className="text-[10px] font-black bg-[#6B7A3A]/10 text-[#6B7A3A] px-2 py-0.5 rounded-full">{prod.Margen}% Margen</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;
