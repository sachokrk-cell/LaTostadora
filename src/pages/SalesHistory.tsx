import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import { Search, Trash2, Calendar, User, Eye, X, AlertTriangle, Filter, ReceiptText, ArrowRight } from 'lucide-react';

const SalesHistory = () => {
  const { sales, deleteSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  
  // NUEVOS ESTADOS PARA RANGO DE FECHAS
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        // Filtro de búsqueda (Cliente o Producto)
        const matchesSearch = s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // FILTRO DE RANGO DE FECHAS
        const saleDate = s.date.split('T')[0]; // Tomamos solo AAAA-MM-DD
        const matchesStart = startDate ? saleDate >= startDate : true;
        const matchesEnd = endDate ? saleDate <= endDate : true;
        
        return matchesSearch && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm, startDate, endDate]);

  const handleDeleteClick = (e: React.MouseEvent, sale: Sale) => {
    e.stopPropagation();
    setSaleToDelete(sale);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteSale(saleToDelete.id);
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
      if (selectedSale?.id === saleToDelete.id) setSelectedSale(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in pb-20 md:pb-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Historial de Ventas</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* BUSCADOR */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente o producto..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:border-gray-900 outline-none transition-all text-gray-900 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* PANEL DE FECHAS - NUEVO Y CON ALTO CONTRASTE */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm uppercase tracking-wider">
          <Calendar size={18} className="text-gray-500" />
          Filtrar por Fecha:
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="date" 
            className="flex-1 sm:w-40 p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-gray-900 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <ArrowRight size={16} className="text-gray-400" />
          <input 
            type="date" 
            className="flex-1 sm:w-40 p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-gray-900 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-bold text-red-600 hover:underline px-2"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900 text-white font-black text-xs uppercase tracking-widest">
              <tr>
                <th className="p-5">Fecha/Hora</th>
                <th className="p-5">Cliente</th>
                <th className="p-5">Items</th>
                <th className="p-5 text-right">Total</th>
                <th className="p-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map(sale => (
                <tr 
                  key={sale.id} 
                  className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedSale(sale)}
                >
                  <td className="p-5 whitespace-nowrap">
                    <div className="font-black text-gray-900 text-base">
                      {new Date(sale.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 font-bold">
                      {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-black shadow-md">
                        {sale.clientName.charAt(0)}
                      </div>
                      <span className="font-black text-gray-900 text-lg">{sale.clientName}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className="inline-block text-xs bg-gray-200 px-3 py-1 rounded-full text-gray-800 font-black mb-1">
                      {sale.items.reduce((acc, i) => acc + i.quantity, 0)} UNID.
                    </span>
                    <p className="text-xs font-bold text-gray-600 truncate max-w-[250px]">
                      {sale.items.map(i => i.name).join(', ')}
                    </p>
                  </td>
                  <td className="p-5 text-right">
                    <span className="text-xl font-black text-gray-900">${sale.total.toLocaleString()}</span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex items-center justify-center gap-3">
                       <button className="p-2.5 text-blue-700 hover:bg-blue-100 rounded-xl transition-all shadow-sm bg-white border border-gray-100">
                         <Eye size={20} />
                       </button>
                       <button 
                         onClick={(e) => handleDeleteClick(e, sale)}
                         className="p-2.5 text-red-600 hover:bg-red-100 rounded-xl transition-all shadow-sm bg-white border border-gray-100"
                       >
                         <Trash2 size={20} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <ReceiptText size={64} className="mx-auto mb-4 text-gray-200" />
                    <p className="text-gray-400 font-black text-xl italic">No hay ventas registradas en este periodo.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALE DETAIL MODAL - REFORZADO CONTRASTE */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-up border-4 border-gray-900">
            <div className="p-8 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-black text-3xl text-gray-900 tracking-tighter">Ticket de Venta</h3>
                  <p className="text-xs text-gray-400 font-black tracking-widest uppercase">ID: {selectedSale.id.substring(0,8)}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-3 hover:bg-gray-200 rounded-full transition-colors text-gray-900">
                  <X size={32} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs uppercase font-black text-gray-400 tracking-widest mb-1">Cliente</p>
                    <p className="text-2xl font-black text-gray-900">{selectedSale.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-black text-gray-400 tracking-widest mb-1">Fecha</p>
                    <p className="font-bold text-gray-900">{new Date(selectedSale.date).toLocaleString()}</p>
                  </div>
              </div>

              <div className="border-2 border-gray-100 rounded-3xl overflow-hidden shadow-inner">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="p-4 text-left font-black uppercase text-[10px] tracking-widest">Item</th>
                          <th className="p-4 text-center font-black uppercase text-[10px] tracking-widest">Cant.</th>
                          <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">Subt.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-50">
                        {selectedSale.items.map((item, idx) => (
                          <tr key={idx} className="bg-white">
                             <td className="p-4">
                                <p className="font-black text-gray-900 text-base">{item.name}</p>
                                <p className="text-xs text-gray-500 font-bold">${item.appliedPrice.toLocaleString()} c/u</p>
                             </td>
                             <td className="p-4 text-center font-black text-lg text-gray-900">{item.quantity}</td>
                             <td className="p-4 text-right font-black text-lg text-gray-900">
                                ${(item.appliedPrice * item.quantity).toLocaleString()}
                             </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
              </div>

              <div className="space-y-3 pt-6 border-t-4 border-gray-900">
                 <div className="flex justify-between text-gray-600 font-bold">
                    <span className="uppercase tracking-widest text-xs">Subtotal</span>
                    <span>${selectedSale.subtotal.toLocaleString()}</span>
                 </div>
                 {selectedSale.discountAmount > 0 && (
                    <div className="flex justify-between text-green-700 font-black bg-green-50 p-2 rounded-lg">
                       <span className="uppercase tracking-widest text-xs">Descuento</span>
                       <span>-${selectedSale.discountAmount.toLocaleString()}</span>
                    </div>
                 )}
                 <div className="flex justify-between text-4xl font-black text-gray-900 tracking-tighter pt-2">
                    <span>TOTAL</span>
                    <span>${selectedSale.total.toLocaleString()}</span>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-gray-900 flex justify-end items-center">
               <button 
                onClick={(e) => handleDeleteClick(e, selectedSale)}
                className="flex items-center gap-3 bg-red-600 text-white px-6 py-3 rounded-2xl hover:bg-red-700 font-black transition-all shadow-lg active:scale-95"
               >
                 <Trash2 size={24} /> ELIMINAR VENTA Y REVERTIR STOCK
               </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL - MAX CONTRASTE */}
      {isDeleteModalOpen && saleToDelete && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border-4 border-red-600 animate-scale-up">
              <div className="p-8 text-center">
                 <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 shadow-inner">
                    <AlertTriangle size={48} />
                 </div>
                 <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">¿Confirmar Eliminación?</h3>
                 <div className="text-gray-900 text-sm mb-8 space-y-2 text-left bg-gray-50 p-4 rounded-xl font-bold">
                    <p className="flex items-center gap-2"><span className="text-red-600">●</span> Se restaurará el stock.</p>
                    <p className="flex items-center gap-2"><span className="text-red-600">●</span> Se borrará del historial.</p>
                    <p className="flex items-center gap-2"><span className="text-red-600">●</span> Esta acción es irreversible.</p>
                 </div>
                 <div className="flex flex-col gap-3">
                    <button 
                       onClick={confirmDelete}
                       className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-700 shadow-xl transition-all active:scale-95"
                    >
                       SÍ, ELIMINAR Y REVERTIR
                    </button>
                    <button 
                       onClick={() => setIsDeleteModalOpen(false)}
                       className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-black hover:bg-gray-200 transition-colors"
                    >
                       NO, CANCELAR
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default SalesHistory;
