import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import { Search, Trash2, Calendar, User, Eye, X, AlertTriangle, Filter, ReceiptText } from 'lucide-react';

const SalesHistory = () => {
  const { sales, deleteSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState('');

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const matchesSearch = s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDate = dateFilter ? s.date.startsWith(dateFilter) : true;
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm, dateFilter]);

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
    <div className="p-4 md:p-8 space-y-6 animate-fade-in pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-coffee-900">Historial de Ventas</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por cliente o producto..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 transition-all text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="date" 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coffee-500 transition-all text-gray-900"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-coffee-900 text-white font-bold">
              <tr>
                <th className="p-4">Fecha/Hora</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Items</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map(sale => (
                <tr 
                  key={sale.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedSale(sale)}
                >
                  <td className="p-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {new Date(sale.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-coffee-100 flex items-center justify-center text-coffee-700 text-xs font-bold">
                        {sale.clientName.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{sale.clientName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {sale.items.reduce((acc, i) => acc + i.quantity, 0)} unid.
                    </span>
                    <p className="text-xs mt-1 truncate max-w-[200px]">
                      {sale.items.map(i => i.name).join(', ')}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-coffee-700">${sale.total.toLocaleString()}</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button 
                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                         title="Ver Detalle"
                       >
                         <Eye size={18} />
                       </button>
                       <button 
                         onClick={(e) => handleDeleteClick(e, sale)}
                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                         title="Eliminar y devolver stock"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    <ReceiptText size={48} className="mx-auto mb-2 opacity-20" />
                    <p>No se encontraron ventas con los filtros actuales.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SALE DETAIL MODAL */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
               <div>
                  <h3 className="font-bold text-xl text-coffee-900">Detalle de Ticket</h3>
                  <p className="text-xs text-gray-500 font-medium">ID: {selectedSale.id.substring(0,8)}</p>
               </div>
               <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={24} className="text-gray-500" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Cliente</p>
                    <p className="text-lg font-bold text-gray-800">{selectedSale.clientName}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Fecha</p>
                    <p className="font-medium text-gray-800">{new Date(selectedSale.date).toLocaleString()}</p>
                 </div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                 <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                       <tr>
                          <th className="p-3 text-left">Item</th>
                          <th className="p-3 text-center">Cant.</th>
                          <th className="p-3 text-right">Subt.</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {selectedSale.items.map((item, idx) => (
                          <tr key={idx}>
                             <td className="p-3">
                                <p className="font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-500">${item.appliedPrice} c/u</p>
                             </td>
                             <td className="p-3 text-center font-medium">{item.quantity}</td>
                             <td className="p-3 text-right font-bold text-gray-700">
                                ${(item.appliedPrice * item.quantity).toLocaleString()}
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>

              <div className="space-y-2 pt-4 border-t">
                 <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>${selectedSale.subtotal.toLocaleString()}</span>
                 </div>
                 {selectedSale.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                       <span>Descuento Aplicado</span>
                       <span>-${selectedSale.discountAmount.toLocaleString()}</span>
                    </div>
                 )}
                 <div className="flex justify-between text-2xl font-black text-coffee-900">
                    <span>TOTAL</span>
                    <span>${selectedSale.total.toLocaleString()}</span>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
               <div className="flex items-center gap-2 text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle size={14} />
                  ¿Error en esta venta?
               </div>
               <button 
                onClick={(e) => handleDeleteClick(e, selectedSale)}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold transition-colors shadow-sm"
               >
                 <Trash2 size={18} /> Eliminar y Revertir Stock
               </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && saleToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 animate-scale-up">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar esta Venta?</h3>
                 <p className="text-gray-600 text-sm mb-6">
                    Esta acción hará lo siguiente:<br/>
                    1. <span className="font-bold">Restaurará el stock</span> de los productos.<br/>
                    2. <span className="font-bold">Restará el total</span> del historial del cliente.<br/>
                    3. Borrará el registro permanentemente.
                 </p>
                 <div className="flex gap-3 justify-center">
                    <button 
                       onClick={() => setIsDeleteModalOpen(false)}
                       className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                    >
                       Cancelar
                    </button>
                    <button 
                       onClick={confirmDelete}
                       className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md transition-colors"
                    >
                       Sí, Eliminar y Revertir
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
