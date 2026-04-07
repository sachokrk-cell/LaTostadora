import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Search, TrendingUp, ShoppingBag, DollarSign, Percent, Briefcase, History, Layers, Trash2, Edit2, X, Calendar as CalendarIcon, CheckSquare, Square, ArrowRightLeft, LineChart, PackageCheck, Filter } from 'lucide-react';
import { Purchase } from '../types';

const ProductAnalysis = () => {
  const { products, sales, purchases, deletePurchase, updatePurchase } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // --- ESTADOS DE FILTRO DE FECHA ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados para Modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  // --- MOTOR DE ANÁLISIS FILTRADO CON MÉTODO PEPS (FIFO) ---
  const analysisData = useMemo(() => {
    if (selectedProductIds.length === 0) return null;

    // 1. Determinar el rango de meses a mostrar
    const months = [];
    if (startDate && endDate) {
      let start = new Date(startDate);
      let end = new Date(endDate);
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        months.push(current.toLocaleString('es-ES', { month: 'short', year: '2-digit' }));
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push(d.toLocaleString('es-ES', { month: 'short', year: '2-digit' }));
      }
    }

    // 2. Filtrar ventas por el rango seleccionado para la vista
    const filteredSales = sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      const matchesStart = !startDate || saleDate >= startDate;
      const matchesEnd = !endDate || saleDate <= endDate;
      return matchesStart && matchesEnd;
    });

    // --- FUNCIÓN HELPER: CALCULAR COSTOS PEPS (FIFO) ---
    const getPepsCostMap = (productId: string) => {
      // Obtenemos los lotes del producto ordenados por fecha (más antiguos primero)
      const lotes = purchases
        .filter(p => p.productId === productId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(p => ({ stockDisponible: Number(p.quantity), costo: Number(p.unitCost) }));

      // Obtenemos TODAS las ventas del producto cronológicamente (necesario para consumir bien los lotes)
      const ventasCronologicas = sales
        .filter(s => s.items.some(i => i.id === productId))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const mapaCostos = new Map<string, number>();

      ventasCronologicas.forEach(s => {
        const item = s.items.find(i => i.id === productId);
        let qtyToConsume = Number(item?.quantity || 0);
        let costoTotalPeps = 0;

        // Consumir lotes cronológicamente
        while (qtyToConsume > 0 && lotes.length > 0) {
          const loteActual = lotes[0];
          if (loteActual.stockDisponible <= qtyToConsume) {
            costoTotalPeps += loteActual.stockDisponible * loteActual.costo;
            qtyToConsume -= loteActual.stockDisponible;
            lotes.shift(); // Lote agotado, pasamos al siguiente
          } else {
            costoTotalPeps += qtyToConsume * loteActual.costo;
            loteActual.stockDisponible -= qtyToConsume;
            qtyToConsume = 0;
          }
        }

        // Fallback: Si se acaban los lotes registrados, usamos el costo genérico del producto
        if (qtyToConsume > 0) {
          costoTotalPeps += qtyToConsume * Number(item?.costPrice || 0);
        }

        mapaCostos.set(s.id, costoTotalPeps);
      });

      return mapaCostos;
    };

    // --- MODO INDIVIDUAL ---
    if (selectedProductIds.length === 1) {
      const pId = selectedProductIds[0];
      let cumulativeProfit = 0;
      
      const costoPepsMap = getPepsCostMap(pId);

      const history = months.map(mKey => {
        const monthSales = filteredSales.filter(s => 
          new Date(s.date).toLocaleString('es-ES', { month: 'short', year: '2-digit' }) === mKey
        );
        
        let revenue = 0, cogs = 0, units = 0;
        monthSales.forEach(s => {
          const item = s.items.find(i => i.id === pId);
          if (item) {
            revenue += item.quantity * (item.appliedPrice || item.sellingPrice);
            cogs += costoPepsMap.get(s.id) || 0; // Aplicamos el costo PEPS exacto
            units += item.quantity;
          }
        });

        const profit = revenue - cogs;
        cumulativeProfit += profit;
        return { month: mKey, Ventas: revenue, Ganancia: profit, Acumulado: cumulativeProfit, Unidades: units };
      });

      return { mode: 'single', history, pId };
    }

    // --- MODO COMPARATIVO ---
    if (selectedProductIds.length > 1) {
      const comparison = selectedProductIds.map(pId => {
        const product = products.find(p => p.id === pId);
        const costoPepsMap = getPepsCostMap(pId);
        
        let totalRev = 0, totalCogs = 0, totalUnits = 0;

        filteredSales.forEach(s => {
          const item = s.items.find(i => i.id === pId);
          if (item) {
            totalRev += item.quantity * (item.appliedPrice || item.sellingPrice);
            totalCogs += costoPepsMap.get(s.id) || 0; // Costo PEPS exacto
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
  }, [selectedProductIds, sales, products, purchases, startDate, endDate]);

  // EL HISTORIAL DE COMPRAS NO SE FILTRA POR FECHA (Siempre completo para auditoría PEPS)
  const productPurchases = useMemo(() => {
    if (selectedProductIds.length !== 1) return [];
    return purchases
      .filter(p => p.productId === selectedProductIds[0])
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, selectedProductIds]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Handlers
  const handleDeletePurchase = (purchaseId: string) => {
    if (window.confirm("¿Eliminar lote? El stock se restará y el cálculo PEPS se recalculará.")) deletePurchase(purchaseId);
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
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-white min-h-screen text-[#1C1C1C] pb-24">
      
      {/* HEADER Y FILTRO DE FECHAS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Análisis Estratégico</h2>
          <p className="text-[#6B7A3A] font-bold text-xs uppercase tracking-[0.2em] mt-2">Rentabilidad por Método PEPS</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-gray-200">
            <Filter size={16} className="text-[#6B7A3A]" />
            <span className="text-[10px] font-black uppercase text-gray-400">Rango de Análisis</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#6B7A3A]"
            />
            <span className="text-gray-300 font-bold">→</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#6B7A3A]"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="p-2 hover:bg-gray-200 rounded-full text-red-500 transition-colors"
              title="Limpiar fechas"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-[2rem] border-2 border-gray-50 shadow-sm">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Variedad..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl outline-none text-sm font-bold focus:bg-white focus:border-[#6B7A3A]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredProducts.map(p => (
                <button 
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3 border-2 ${selectedProductIds.includes(p.id) ? 'bg-[#1C1C1C] border-[#1C1C1C] text-white shadow-lg scale-[1.02]' : 'bg-white border-transparent hover:border-gray-100'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedProductIds.includes(p.id) ? 'bg-[#6B7A3A]' : 'bg-gray-200'}`}></div>
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{p.name}</p>
                    <p className={`text-[10px] font-bold uppercase ${selectedProductIds.includes(p.id) ? 'text-[#6B7A3A]' : 'text-gray-400'}`}>{p.category}</p>
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
               <TrendingUp size={48} className="text-gray-200 mb-4 animate-pulse"/>
               <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Esperando Selección</h3>
               <p className="text-gray-400 text-xs mt-2 font-bold italic">Elige uno o más productos para auditar su rendimiento.</p>
            </div>
          ) : analysisData.mode === 'single' ? (
            <div className="space-y-6 animate-fade-in">
              {/* KPIs INDIVIDUAL FILTRADOS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1C1C1C] p-7 rounded-[2.5rem] text-[#E8DFC8] border-b-8 border-[#6B7A3A]">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6B7A3A] mb-2">Vendidas en Periodo</p>
                   <h4 className="text-5xl font-black">{analysisData.history?.reduce((acc,h) => acc + h.Unidades, 0)}</h4>
                </div>
                <div className="bg-white p-7 rounded-[2.5rem] border-2 border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
                   <div className="absolute top-4 right-4 bg-green-50 text-green-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-100">
                     Cálculo PEPS
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Ganancia Neta Real</p>
                   <h4 className="text-4xl font-black text-[#1C1C1C]">${analysisData.history?.reduce((acc,h) => acc + h.Ganancia, 0).toLocaleString()}</h4>
                </div>
                <div className="bg-gray-50 p-7 rounded-[2.5rem] border-2 border-gray-100 flex flex-col justify-center text-right">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6B7A3A] mb-2">Margen Real</p>
                   <h4 className="text-4xl font-black text-[#1C1C1C]">
                     {Math.round((analysisData.history?.reduce((acc,h) => acc + h.Ganancia, 0) / (analysisData.history?.reduce((acc,h) => acc + h.Ventas, 0) || 1)) * 100)}%
                   </h4>
                </div>
              </div>

              {/* GRÁFICO DE EVOLUCIÓN */}
              <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-gray-100">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Curva de Rentabilidad {startDate && 'Filtrada'}</h3>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#6B7A3A] rounded-full"></div> <span className="text-[10px] font-black uppercase">Mes</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#1C1C1C] border border-gray-300 rounded-full"></div> <span className="text-[10px] font-black uppercase">Acumulado</span></div>
                   </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysisData.history}>
                      <defs>
                        <linearGradient id="gradAnalysis" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6B7A3A" stopOpacity={0.4}/><stop offset="95%" stopColor="#6B7A3A" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis hide />
                      <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                      <Area name="Ganancia PEPS" type="monotone" dataKey="Ganancia" stroke="#6B7A3A" strokeWidth={5} fill="url(#gradAnalysis)" />
                      <Area name="Acumulado" type="monotone" dataKey="Acumulado" stroke="#1C1C1C" strokeWidth={2} fill="transparent" strokeDasharray="6 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TABLA DE COMPRAS (HISTORIAL COMPLETO / LOTES PEPS) */}
              <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-gray-100 overflow-hidden relative">
                 <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-[#1C1C1C] flex items-center gap-2">
                         <History size={16} className="text-[#6B7A3A]"/> Trazabilidad de Lotes de Compra
                      </h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Estos lotes se consumen automáticamente para calcular el costo (FIFO/PEPS)</p>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead className="bg-[#1C1C1C] text-[#E8DFC8] font-black text-[10px] uppercase">
                          <tr>
                             <th className="p-5 text-left">Fecha de Entrada</th>
                             <th className="p-5 text-center">Stock Comprado</th>
                             <th className="p-5 text-right">Costo Unitario</th>
                             <th className="p-5 text-right">Inversión Total</th>
                             <th className="p-5 text-center">Acciones</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {productPurchases.map((purchase) => (
                             <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-5 font-bold text-gray-500">{new Date(purchase.date).toLocaleDateString()}</td>
                                <td className="p-5 text-center font-black text-[#1C1C1C]">{purchase.quantity} UN.</td>
                                <td className="p-5 text-right font-bold text-[#6B7A3A]">${purchase.unitCost.toLocaleString()}</td>
                                <td className="p-5 text-right font-black text-[#1C1C1C]">${purchase.totalCost.toLocaleString()}</td>
                                <td className="p-5 text-center flex justify-center gap-2">
                                   <button onClick={() => handleOpenEdit(purchase)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-all"><Edit2 size={16}/></button>
                                   <button onClick={() => handleDeletePurchase(purchase.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-all"><Trash2 size={16}/></button>
                                </td>
                             </tr>
                          ))}
                          {productPurchases.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest">No hay lotes de compra registrados</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          ) : (
            // --- VISTA COMPARATIVA FILTRADA ---
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#1C1C1C] p-10 rounded-[3rem] text-white border-b-[12px] border-[#6B7A3A] shadow-2xl relative">
                <div className="absolute top-8 right-10 bg-white/10 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">
                     Cálculo PEPS Activo
                </div>
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#6B7A3A]">Ranking Comparativo {startDate && '(Filtrado)'}</h3>
                  <ArrowRightLeft className="text-white/20" size={32}/>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData.comparison}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#fff', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{borderRadius: '1rem', border: 'none', backgroundColor: '#fff', color: '#000'}} />
                      <Bar name="Ventas" dataKey="Ventas" fill="#6B7A3A" radius={[12, 12, 0, 0]} barSize={40} />
                      <Bar name="Ganancia PEPS" dataKey="Ganancia" fill="#E8DFC8" radius={[12, 12, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {analysisData.comparison?.map((prod, idx) => (
                   <div key={idx} className="bg-white p-7 rounded-[2.5rem] border-2 border-gray-100 flex justify-between items-center shadow-sm hover:border-[#6B7A3A] transition-all group">
                      <div>
                        <p className="font-black text-[#1C1C1C] text-lg group-hover:text-[#6B7A3A] transition-colors">{prod.name}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{prod.Unidades} unidades en el periodo</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-[#1C1C1C]">${prod.Ganancia.toLocaleString()}</p>
                        <span className="text-[10px] font-black bg-[#6B7A3A] text-white px-3 py-1 rounded-full">{prod.Margen}% Margen</span>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDITAR COMPRA */}
      {isEditModalOpen && editingPurchase && (
        <div className="fixed inset-0 bg-[#1C1C1C]/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border-4 border-[#6B7A3A] overflow-hidden animate-scale-up">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Corregir Lote</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Fecha de Ingreso</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 text-gray-400" size={20}/>
                  <input type="date" value={editingPurchase.date.split('T')[0]} onChange={e => setEditingPurchase({...editingPurchase, date: new Date(e.target.value).toISOString()})} className="w-full pl-10 p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-[#6B7A3A]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Cantidad</label>
                  <input type="number" value={editingPurchase.quantity} onChange={e => setEditingPurchase({...editingPurchase, quantity: Number(e.target.value)})} className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-black text-xl outline-none focus:border-[#6B7A3A]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Costo ($)</label>
                  <input type="number" value={editingPurchase.unitCost} onChange={e => setEditingPurchase({...editingPurchase, unitCost: Number(e.target.value)})} className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-black text-xl outline-none focus:border-[#6B7A3A]" />
                </div>
              </div>
              <button type="submit" className="w-full py-6 bg-[#6B7A3A] text-white rounded-2xl font-black text-xl shadow-xl hover:scale-[0.98] active:scale-95 transition-all uppercase italic tracking-tighter">Confirmar Cambios</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalysis;
