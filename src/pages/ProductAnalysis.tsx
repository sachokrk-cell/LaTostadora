import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, TrendingUp, ShoppingBag, DollarSign, ArrowUpRight, Percent, Briefcase, History, PackageCheck, Layers, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

const ProductAnalysis = () => {
  // EXTRAEMOS deletePurchase DEL STORE
  const { products, sales, purchases, deletePurchase } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  const productPurchases = useMemo(() => {
    if (!selectedProductId) return [];
    return purchases
      .filter(p => p.productId === selectedProductId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, selectedProductId]);

  const historyData = useMemo(() => {
    if (!selectedProductId) return [];

    const monthsMap: Record<string, { month: string, units: number, revenue: number, cogs: number, profit: number, timestamp: number }> = {};
    
    for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
        monthsMap[monthKey] = { month: monthKey, units: 0, revenue: 0, cogs: 0, profit: 0, timestamp: d.getTime() };
    }

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const monthKey = saleDate.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      
      const item = sale.items.find(i => i.id === selectedProductId);
      if (item && monthsMap[monthKey]) {
        const itemRevenue = item.quantity * (item.appliedPrice || item.sellingPrice);
        const itemCogs = item.quantity * (item.costPrice || 0);
        
        monthsMap[monthKey].units += item.quantity;
        monthsMap[monthKey].revenue += itemRevenue;
        monthsMap[monthKey].cogs += itemCogs;
        monthsMap[monthKey].profit += (itemRevenue - itemCogs);
      }
    });

    return Object.values(monthsMap).sort((a, b) => a.timestamp - b.timestamp);
  }, [sales, selectedProductId]);

  const stats = useMemo(() => {
    if (!historyData.length) return null;
    const totalUnits = historyData.reduce((acc, d) => acc + d.units, 0);
    const totalRevenue = historyData.reduce((acc, d) => acc + d.revenue, 0);
    const totalProfit = historyData.reduce((acc, d) => acc + d.profit, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const bestMonth = [...historyData].sort((a, b) => b.units - a.units)[0];
    
    return { totalUnits, totalRevenue, totalProfit, avgMargin, bestMonth };
  }, [historyData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // FUNCIÓN PARA MANEJAR EL BORRADO
  const handleDeletePurchase = (purchaseId: string) => {
    if (window.confirm("¿Estás seguro de eliminar esta compra? El stock se ajustará automáticamente.")) {
        deletePurchase(purchaseId);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-coffee-900 tracking-tighter uppercase">Inteligencia de Producto</h2>
          <p className="text-gray-500 font-medium">Auditoría financiera y control de lotes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Selector de Producto */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="Buscar producto..." 
                   className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coffee-500 outline-none text-sm font-bold"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <div className="max-h-[600px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 border-2 ${selectedProductId === p.id ? 'bg-coffee-50 border-coffee-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${selectedProductId === p.id ? 'text-coffee-900' : 'text-gray-700'}`}>{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase">{p.category}</p>
                    </div>
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* Dash de Análisis */}
        <div className="lg:col-span-3 space-y-6">
           {selectedProduct ? (
             <div className="space-y-6 animate-scale-up">
                {/* Cabecera Producto */}
                <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                       <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center md:text-left">
                       <span className="text-xs font-black text-coffee-600 uppercase tracking-widest bg-coffee-50 px-3 py-1 rounded-full">{selectedProduct.category}</span>
                       <h3 className="text-3xl font-black text-gray-900 mt-2 tracking-tighter">{selectedProduct.name}</h3>
                       <p className="text-sm text-gray-500 font-medium">Análisis de rentabilidad real</p>
                    </div>
                    <div className="md:ml-auto text-center md:text-right bg-coffee-50 p-4 rounded-2xl border border-coffee-100">
                       <p className="text-xs font-black text-coffee-400 uppercase tracking-widest leading-none mb-1">Stock Actual</p>
                       <p className="text-4xl font-black text-coffee-900">{selectedProduct.stock}</p>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                         <ShoppingBag size={18} />
                         <h4 className="font-black uppercase text-[10px] tracking-wider">Vendidas</h4>
                      </div>
                      <p className="text-2xl font-black text-gray-800">{stats?.totalUnits}</p>
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                         <DollarSign size={18} />
                         <h4 className="font-black uppercase text-[10px] tracking-wider">Ingresos</h4>
                      </div>
                      <p className="text-2xl font-black text-gray-800">${stats?.totalRevenue.toLocaleString()}</p>
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 text-coffee-600 mb-2">
                         <Briefcase size={18} />
                         <h4 className="font-black uppercase text-[10px] tracking-wider">Utilidad</h4>
                      </div>
                      <p className="text-2xl font-black text-coffee-900">${stats?.totalProfit.toLocaleString()}</p>
                   </div>
                   <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-700 mb-2">
                         <Percent size={18} />
                         <h4 className="font-black uppercase text-[10px] tracking-wider">Margen</h4>
                      </div>
                      <p className="text-2xl font-black text-amber-900">{stats?.avgMargin.toFixed(1)}%</p>
                   </div>
                </div>

                {/* Gráfico */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
                    <h4 className="font-black text-coffee-900 flex items-center gap-2 mb-8 uppercase text-xs tracking-widest">
                      <TrendingUp size={16} /> Evolución del Producto
                    </h4>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={historyData}>
                            <defs>
                               <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                            <XAxis dataKey="month" tick={{fontSize: 11, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                            <Tooltip 
                               contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                               formatter={(value, name) => [
                                 name === 'units' ? `${value} un.` : `$${Number(value).toLocaleString()}`, 
                                 name === 'units' ? 'Unidades' : 'Utilidad Bruta'
                               ]}
                            />
                            <Legend />
                            <Area name="Utilidad ($)" type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                            <Area name="Unidades" type="monotone" dataKey="units" stroke="#8a6256" strokeWidth={2} fillOpacity={0.1} fill="#8a6256" />
                         </AreaChart>
                      </ResponsiveContainer>
                    </div>
                </div>

                {/* Registro de Compras con BOTÓN DE BORRAR */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
                   <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                         <History size={14} /> Historial de Compras (Lotes)
                      </h4>
                   </div>
                   <div className="overflow-x-auto flex-1">
                      <table className="w-full text-sm">
                         <thead className="bg-gray-100 text-gray-500 font-black text-[10px] uppercase">
                            <tr>
                               <th className="p-3 text-left">Fecha</th>
                               <th className="p-3 text-center">Cant.</th>
                               <th className="p-3 text-right">Costo U.</th>
                               <th className="p-3 text-right">Total</th>
                               <th className="p-3 text-center">Acciones</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {productPurchases.map((purchase) => (
                               <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3 text-xs font-medium text-gray-500">{new Date(purchase.date).toLocaleDateString()}</td>
                                  <td className="p-3 text-center font-bold text-gray-700">{purchase.quantity}</td>
                                  <td className="p-3 text-right font-bold text-coffee-600">${purchase.unitCost.toLocaleString()}</td>
                                  <td className="p-3 text-right font-black text-gray-900">${purchase.totalCost.toLocaleString()}</td>
                                  <td className="p-3 text-center">
                                     <button 
                                       onClick={() => handleDeletePurchase(purchase.id)}
                                       className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                       title="Eliminar compra"
                                     >
                                       <Trash2 size={16} />
                                     </button>
                                  </td>
                               </tr>
                            ))}
                            {productPurchases.length === 0 && (
                               <tr>
                                  <td colSpan={5} className="p-10 text-center text-gray-300 italic text-xs">
                                     No hay compras registradas.
                                  </td>
                               </tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                   <div className="p-3 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-700 font-bold flex items-center gap-2">
                      <PackageCheck size={14} /> Al eliminar una compra, el stock del producto se restará automáticamente.
                   </div>
                </div>
             </div>
           ) : (
             <div className="bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 h-[600px] flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                   <Briefcase size={48} className="text-gray-200" />
                </div>
                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest">Auditoría de Lotes</h3>
                <p className="text-sm text-gray-400 max-w-xs mt-4">Selecciona un producto del menú lateral para ver su rendimiento y gestionar sus compras.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;
