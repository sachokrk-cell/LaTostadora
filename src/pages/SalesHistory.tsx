import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import { Search, Trash2, Calendar, Eye, X, AlertTriangle, ReceiptText, ArrowRight, ChevronRight, Clock, ShoppingBag } from 'lucide-react';

const SalesHistory = () => {
  const { sales, deleteSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const matchesSearch = s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const saleDate = s.date.split('T')[0];
        const matchesStart = startDate ? saleDate >= startDate : true;
        const matchesEnd = endDate ? saleDate <= endDate : true;
        return matchesSearch && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm, startDate, endDate]);

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteSale(saleToDelete.id);
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
      if (selectedSale?.id === saleToDelete.id) setSelectedSale(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1C1C1C]">
      
      {/* TÍTULO Y BUSCADOR */}
      <div className="flex flex-col gap-4">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Ventas</h2>
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Cliente o producto..." 
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-[#6B7A3A] transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* FILTROS DE FECHA RESPONSIVOS */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-gray-100 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest px-2">
          <Calendar size={14} /> Rango:
        </div>
        <div className="flex items-center gap-2 w-full">
          <input type="date" className="flex-1 p-2.5 bg-gray-50 rounded-xl text-xs font-black outline-none border border-transparent focus:border-[#6B7A3A]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <ArrowRight size={14} className="text-gray-300" />
          <input type="date" className="flex-1 p-2.5 bg-gray-50 rounded-xl text-xs font-black outline-none border border-transparent focus:border-[#6B7A3A]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-2 text-red-500"><X size={20}/></button>
          )}
        </div>
      </div>

      {/* VISTA PARA PC (TABLA) */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-[#1C1C1C] text-[#E8DFC8] font-black text-[10px] uppercase tracking-widest">
            <tr>
              <th className="p-5">Fecha</th>
              <th className="p-5">Cliente</th>
              <th className="p-5 text-right">Total</th>
              <th className="p-5 text-center">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredSales.map(sale => (
              <tr key={sale.id} className="hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => setSelectedSale(sale)}>
                <td className="p-5 whitespace-nowrap">
                  <div className="font-black text-[#1C1C1C]">{new Date(sale.date).toLocaleDateString()}</div>
                  <div className="text-[10px] text-gray-400 font-bold">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="p-5">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#6B7A3A] text-[#E8DFC8] flex items-center justify-center text-[10px] font-black">{sale.clientName.charAt(0)}</div>
                      <span className="font-black">{sale.clientName}</span>
                   </div>
                </td>
                <td className="p-5 text-right font-black text-xl">${sale.total.toLocaleString()}</td>
                <td className="p-5 text-center">
                   <button className="p-2 hover:bg-[#6B7A3A]/10 rounded-xl text-[#6B7A3A]"><Eye size={20}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VISTA PARA MÓVIL (TARJETAS) */}
      <div className="md:hidden space-y-3">
        {filteredSales.map(sale => (
          <div 
            key={sale.id} 
            onClick={() => setSelectedSale(sale)}
            className="bg-white p-5 rounded-[2rem] border-2 border-gray-100 active:scale-[0.98] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] text-[#6B7A3A] flex items-center justify-center shadow-lg">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="font-black text-base leading-none mb-1">{sale.clientName}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Clock size={10}/> {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(sale.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-lg text-[#1C1C1C]">${sale.total.toLocaleString()}</p>
              <ChevronRight size={18} className="text-gray-300 ml-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredSales.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
           <ReceiptText size={48} className="text-gray-200 mb-4" />
           <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Sin ventas en este periodo</p>
        </div>
      )}

      {/* MODAL DETALLE (RESPONSIVO: FULLSCREEN EN MÓVIL) */}
      {selectedSale && (
        <div className="fixed inset-0 bg-[#1C1C1C]/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col overflow-hidden animate-slide-up border-t-8 border-[#6B7A3A]">
            <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-black text-2xl text-[#1C1C1C] tracking-tighter uppercase italic">Ticket</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ID: {selectedSale.id.substring(0,8)}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-3 hover:bg-gray-200 rounded-full text-[#1C1C1C]"><X size={28} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-center">
                 <div>
                   <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Cliente</p>
                   <p className="text-xl font-black text-[#1C1C1C]">{selectedSale.clientName}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Fecha</p>
                   <p className="font-bold text-xs">{new Date(selectedSale.date).toLocaleString()}</p>
                 </div>
              </div>

              <div className="space-y-3">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <p className="font-black text-[#1C1C1C]">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{item.quantity} x ${item.appliedPrice.toLocaleString()}</p>
                    </div>
                    <p className="font-black text-[#1C1C1C]">${(item.appliedPrice * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t-4 border-[#1C1C1C] flex justify-between items-end">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Total Final</p>
                  <p className="text-4xl font-black text-[#1C1C1C] tracking-tighter">${selectedSale.total.toLocaleString()}</p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
               <button 
                onClick={(e) => { e.stopPropagation(); setSaleToDelete(selectedSale); setIsDeleteModalOpen(true); }}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 font-black transition-all active:scale-95 text-xs uppercase"
               >
                 Eliminar Venta
               </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN BORRAR */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center border-t-8 border-red-600">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
              <h3 className="text-xl font-black mb-2 uppercase">¿Eliminar Venta?</h3>
              <p className="text-xs text-gray-500 font-bold mb-6">El stock volverá al inventario automáticamente.</p>
              <div className="flex flex-col gap-2">
                <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase">Sí, eliminar</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 bg-gray-100 rounded-2xl font-black uppercase">Cancelar</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default SalesHistory;
