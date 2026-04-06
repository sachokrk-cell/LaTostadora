import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Search, TrendingUp, ShoppingBag, DollarSign, Percent, Briefcase, History, Layers, Trash2, Edit2, X, Calendar, CheckSquare, Square, ArrowRightLeft, LineChart, PackageCheck } from 'lucide-react';
import { Purchase } from '../types';

const ProductAnalysis = () => {
  const { products, sales, purchases, deletePurchase, updatePurchase } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Estados para Modal de Edición de Compras
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  // --- PROCESAMIENTO DE DATOS ---
  const analysisData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toLocaleString('es-ES', { month: 'short' }));
    }

    if (selectedProductIds.length === 1) {
      const pId = selectedProductIds[0];
      let cumulativeProfit = 0;
      const history = months.map(m => {
        const monthSales = sales.filter(s => new Date(s.date).toLocaleString('es-ES', { month: 'short' }) === m);
        let revenue = 0, cogs = 0, units = 0;
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
      return { mode: 'single', history, pId };
    }

    if (selectedProductIds.length > 1) {
      const comparison = selectedProductIds.map(pId => {
        const product = products.find(p => p.id === pId);
        let totalRev = 0, totalCogs = 0, totalUnits = 0;
        sales.forEach(s => {
          const item = s.items.find(i => i.id === pId);
          if (item) {
            totalRev += item.quantity * (item.appliedPrice || item.sellingPrice);
            totalCogs += item.quantity * (item.costPrice || 0);
            totalUnits += item.quantity;
          }
        });
        return { name: product?.name || '?', Ventas: totalRev, Ganancia: totalRev - totalCogs, Unidades: totalUnits, Margen: totalRev > 0 ? Math.round(((totalRev - totalCogs) / totalRev) * 100) : 0 };
      });
      return { mode: 'compare', comparison };
    }
    return null;
  }, [selectedProductIds, sales, products]);

  // Historial de compras filtrado para el producto seleccionado
  const productPurchases = useMemo(() => {
    if (selectedProductIds.length !== 1) return [];
    return purchases
      .filter(p => p.productId === selectedProductIds[0])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, selectedProductIds]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Funciones de Acción
  const handleDeletePurchase = (purchaseId: string) => {
    if (window.confirm("¿Estás seguro de eliminar esta compra? El stock se restará automáticamente.")) {
        deletePurchase(purchaseId);
    }
  };

  const handleOpenEdit = (purchase: Purchase) => {
    setEditingPurchase({...purchase});
    setIsEditModalOpen(true);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPurchase) {
        updatePurchase({ ...editingPurchase, totalCost: Number(editingPurchase.quantity) * Number(editingPurchase.unitCost) });
        setIsEditModalOpen(false);
        setEditingPurchase(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen text-[#1C1C1C] pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Análisis Estratégico</h2>
          <p className="text-[#6B7A3A] font-bold text-xs uppercase tracking-[0.2em]">La Tostadora - Inteligencia de Negocio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100 shadow-sm">
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

        {/* ÁREA DE CONTENIDO */}
        <div className="lg:col-span-3">
          {!analysisData ? (
            <div className="h-[500px] flex flex-col items-center justify-center text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 text-gray-400 font-bold uppercase">
               Selecciona productos para analizar
            </div>
          ) : analysisData.mode === 'single' ? (
            <div className="space-y-6 animate-fade-in">
              {/* KPIs INDIVIDUAL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1C1C1C] p-6 rounded-[2.5rem] text-[#E8DFC8]">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#6B7A3A] mb-2">Vendidas (6m)</p>
                   <h4 className="text-4xl font-black">{analysisData.history?.reduce((acc,h) => acc + h.Unidades, 0)}</h4>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm text-center">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Ganancia Total</p>
                   <h4 className="text-4xl font-black text-[#1C1C1C]">${analysisData.history?.reduce((acc,h) => acc + h.Ganancia, 0).toLocaleString()}</h4>
                </div>
                <div className="bg-[#6B7A3A] p-6 rounded-[2.5rem] text-white text-right">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Margen Promedio</p>
                   <h4 className="text-4xl font-black">
                     {Math.round((analysisData.history?.reduce((acc,h) => acc + h.Ganancia, 0) / (analysisData.history?.reduce((acc,h) => acc + h.Ventas, 0) || 1)) * 100)}%
                   </h4>
                </div>
              </div>

              {/* GRÁFICO */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-gray-100">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-gray-400">Evolución y Ganancia Acumulada</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysisData.history}>
                      <defs>
                        <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6B7A3A" stopOpacity={0.3}/><stop offset="95%" stopColor="#6B7A3A" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none'}} />
                      <Area name="Ganancia Mensual" type="monotone" dataKey="Ganancia" stroke="#6B7A3A" strokeWidth={4} fill="url(#grad1)" />
                      <Area name="Acumulado" type="monotone" dataKey="Acumulado" stroke="#1C1C1C" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* HISTORIAL DE COMPRAS (RESTAURADO) */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-gray-100 overflow-hidden">
                 <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                       <History size={16} /> Registro de Lotes y Costos
                    </h4>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead className="bg-[#1C1C1C] text-[#E8DFC8] font-black text-[10px] uppercase">
                          <tr>
                             <th className="p-4 text-left">Fecha</th>
                             <th className="p-4 text-center">Cant.</th>
                             <th className="p-4 text-right">Costo U.</th>
                             <th className="p-4 text-right">Total</th>
                             <th className="p-4 text-center">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {productPurchases.map((purchase) => (
                             <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-bold text-gray-500">{new Date(purchase.date).toLocaleDateString()}</td>
                                <td className="p-4 text-center font-black text-[#1C1C1C]">{purchase.quantity}</td>
                                <td className="p-4 text-right font-bold text-[#6B7A3A]">${purchase.unitCost.toLocaleString()}</td>
                                <td className="p-4 text-right font-black text-[#1C1C1C]">${purchase.totalCost.toLocaleString()}</td>
                                <td className="p-4 text-center flex justify-center gap-2">
                                   <button onClick={() => handleOpenEdit(purchase)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                   <button onClick={() => handleDeletePurchase(purchase.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 <div className="p-4 bg-amber-50 text-[10px] text-amber-700 font-bold flex items-center gap-2 border-t border-amber-100">
                    <PackageCheck size={14} /> Los cambios en estos lotes recalculan automáticamente la rentabilidad y el stock.
                 </div>
              </div>
            </div>
          ) : (
            // --- VISTA COMPARATIVA ---
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#1C1C1C] p-8 rounded-[3rem] text-white border-b-8 border-[#6B7A3A]">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-[#6B7A3A]">Ventas vs Ganancia por Variedad</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData.comparison}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#fff', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#fff', fontSize: 10}} />
                      <Tooltip contentStyle={{borderRadius: '1rem', color: '#000'}} />
                      <Bar name="Ventas" dataKey="Ventas" fill="#6B7A3A" radius={[10, 10, 0, 0]} />
                      <Bar name="Ganancia" dataKey="Ganancia" fill="#E8DFC8" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {analysisData.comparison?.map((prod, idx) => (
                   <div key={idx} className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 flex justify-between items-center shadow-sm">
                      <div><p className="font-black text-[#1C1C1C]">{prod.name}</p><p className="text-[10px] font-black text-[#6B7A3A] uppercase">{prod.Unidades} vendidas</p></div>
                      <div className="text-right"><p className="text-xl font-black text-[#1C1C1C]">${prod.Ganancia.toLocaleString()}</p><span className="text-[10px] font-black bg-[#6B7A3A]/10 text-[#6B7A3A] px-2 py-0.5 rounded-full">{prod.Margen}%</span></div>
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDITAR COMPRA */}
      {isEditModalOpen && editingPurchase && (
        <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border-4 border-[#1C1C1C] overflow-hidden">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic">Editar Lote</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Fecha</label>
                <input type="date" value={editingPurchase.date.split('T')[0]} onChange={e => setEditingPurchase({...editingPurchase, date: new Date(e.target.value).toISOString()})} className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold outline-none focus:border-[#6B7A3A]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Cantidad</label>
                  <input type="number" step="0.01" value={editingPurchase.quantity} onChange={e => setEditingPurchase({...editingPurchase, quantity: Number(e.target.value)})} className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-black text-xl outline-none focus:border-[#6B7A3A]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Costo Unit.</label>
                  <input type="number" value={editingPurchase.unitCost} onChange={e => setEditingPurchase({...editingPurchase, unitCost: Number(e.target.value)})} className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-black text-xl outline-none focus:border-[#6B7A3A]" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-[#6B7A3A] text-white rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all uppercase italic">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalysis;
