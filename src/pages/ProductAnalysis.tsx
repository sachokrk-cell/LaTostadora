import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Search, TrendingUp, ShoppingBag, DollarSign, ArrowUpRight, Percent, Briefcase, History, PackageCheck, Layers, Trash2, Edit2, X, Calendar } from 'lucide-react';
import { Product, Purchase } from '../types';

const ProductAnalysis = () => {
  const { products, sales, purchases, deletePurchase, updatePurchase } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Estados para el Modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

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
    return { totalUnits, totalRevenue, totalProfit, avgMargin };
  }, [historyData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

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
        updatePurchase({
            ...editingPurchase,
            totalCost: Number(editingPurchase.quantity) * Number(editingPurchase.unitCost)
        });
        setIsEditModalOpen(false);
        setEditingPurchase(null);
        alert("Compra actualizada correctamente.");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black text-coffee-900 tracking-tighter uppercase">Inteligencia de Producto</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Selector Izquierdo */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                 <input type="text" placeholder="Buscar producto..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coffee-500 outline-none text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="max-h-[600px] overflow-y-auto space-y-1 custom-scrollbar">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => setSelectedProductId(p.id)} className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 border-2 ${selectedProductId === p.id ? 'bg-coffee-50 border-coffee-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}`}>
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

        {/* Dashboard de Análisis */}
        <div className="lg:col-span-3 space-y-6">
           {selectedProduct ? (
             <div className="space-y-6 animate-scale-up">
                {/* Header */}
                <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                       <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center md:text-left flex-1">
                       <span className="text-xs font-black text-coffee-600 uppercase tracking-widest bg-coffee-50 px-3 py-1 rounded-full">{selectedProduct.category}</span>
                       <h3 className="text-3xl font-black text-gray-900 mt-2 tracking-tighter">{selectedProduct.name}</h3>
                    </div>
                    <div className="bg-coffee-50 p-4 rounded-2xl border border-coffee-100 text-right">
                       <p className="text-xs font-black text-coffee-400 uppercase">Stock Real</p>
                       <p className="text-4xl font-black text-coffee-900">{selectedProduct.stock}</p>
                    </div>
                </div>

                {/* Historial de Compras con Edición */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
                   <div className="p-4 bg-gray-50 border-b">
                      <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-2">
                         <History size={14} /> Gestión de Compras
                      </h4>
                   </div>
                   <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                         <thead className="bg-gray-100 text-gray-500 font-black text-[10px] uppercase">
                            <tr>
                               <th className="p-3 text-left">Fecha</th>
                               <th className="p-3 text-center">Cantidad</th>
                               <th className="p-3 text-right">Costo Unit.</th>
                               <th className="p-3 text-right">Total</th>
                               <th className="p-3 text-center">Acciones</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {productPurchases.map((purchase) => (
                               <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3 text-xs font-medium">{new Date(purchase.date).toLocaleDateString()}</td>
                                  <td className="p-3 text-center font-bold text-gray-700">{purchase.quantity}</td>
                                  <td className="p-3 text-right font-bold text-coffee-600">${purchase.unitCost.toLocaleString()}</td>
                                  <td className="p-3 text-right font-black text-gray-900">${purchase.totalCost.toLocaleString()}</td>
                                  <td className="p-3 text-center flex justify-center gap-1">
                                     <button onClick={() => handleOpenEdit(purchase)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit2 size={16}/></button>
                                     <button onClick={() => handleDeletePurchase(purchase.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 size={16}/></button>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-96 flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest bg-gray-50 rounded-[3rem] border-4 border-dashed">
                Selecciona un producto para analizar
             </div>
           )}
        </div>
      </div>

      {/* MODAL PARA EDITAR COMPRA */}
      {isEditModalOpen && editingPurchase && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border-4 border-[#1C1C1C] overflow-hidden animate-scale-up">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-xl font-black text-[#1C1C1C] uppercase italic">Editar Compra</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Fecha de Compra</label>
                <div className="relative">
                   <Calendar className="absolute left-3 top-3 text-gray-400" size={20}/>
                   <input type="date" value={editingPurchase.date.split('T')[0]} onChange={e => setEditingPurchase({...editingPurchase, date: new Date(e.target.value).toISOString()})} className="w-full pl-10 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold outline-none focus:border-[#6B7A3A]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Cantidad</label>
                  <input type="number" step="0.01" value={editingPurchase.quantity} onChange={e => setEditingPurchase({...editingPurchase, quantity: Number(e.target.value)})} className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-black text-xl outline-none focus:border-[#6B7A3A]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Costo Unit. ($)</label>
                  <input type="number" value={editingPurchase.unitCost} onChange={e => setEditingPurchase({...editingPurchase, unitCost: Number(e.target.value)})} className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-black text-xl outline-none focus:border-[#6B7A3A]" />
                </div>
              </div>

              <div className="bg-[#1C1C1C] p-4 rounded-2xl flex justify-between items-center border-b-4 border-[#6B7A3A]">
                <span className="text-[#E8DFC8] font-black uppercase text-[10px] tracking-widest">Nuevo Total</span>
                <span className="text-[#E8DFC8] font-black text-2xl">${(editingPurchase.quantity * editingPurchase.unitCost).toLocaleString()}</span>
              </div>

              <button type="submit" className="w-full py-5 bg-[#6B7A3A] text-[#E8DFC8] rounded-2xl font-black text-xl shadow-xl hover:scale-[0.98] active:scale-95 transition-all uppercase tracking-tighter italic">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalysis;
