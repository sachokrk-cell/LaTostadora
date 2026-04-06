import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import { 
  Search, Trash2, Calendar, Eye, X, AlertTriangle, 
  ReceiptText, ArrowRight, ChevronRight, Clock, ShoppingBag 
} from 'lucide-react';

const SalesHistory = () => {
  const { sales, deleteSale, isLoading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const matchesSearch = (s.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (s.items || []).some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const saleDate = s.date.split('T')[0];
        const matchesStart = startDate ? saleDate >= startDate : true;
        const matchesEnd = endDate ? saleDate <= endDate : true;
        
        return matchesSearch && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm, startDate, endDate]);

  const confirmDelete = async () => {
    if (saleToDelete) {
      await deleteSale(saleToDelete.id);
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
      if (selectedSale?.id === saleToDelete.id) setSelectedSale(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#6B7A3A]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 text-[#1C1C1C] bg-white min-h-screen animate-fade-in">
      
      {/* TÍTULO Y BUSCADOR */}
      <div className="flex flex-col gap-4">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Historial</h2>
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o producto..." 
            className="w-full pl-12 pr-4 py-5 bg-gray-50 border-2 border-transparent rounded-[2rem] outline-none focus:border-[#6B7A3A] focus:bg-white transition-all font-bold shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* FILTROS DE FECHA */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-50 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest px-2">
          <Calendar size={14} /> Filtrar por fecha:
        </div>
        <div className="flex items-center gap-3 w-full">
          <input type="date" className="flex-1 p-3 bg-gray-50 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-[#6B7A3A] transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <ArrowRight size={14} className="text-gray-300" />
          <input type="date" className="flex-1 p-3 bg-gray-50 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-[#6B7A3A] transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-3 text-red-500 bg-red-50 rounded-2xl hover:bg-red-100 transition-all"><X size={20}/></button>
          )}
        </div>
      </div>

      {/* LISTADO DE VENTAS */}
      <div className="space-y-3">
        {filteredSales.map(sale => (
          <div 
            key={sale.id} 
            onClick={() => setSelectedSale(sale)}
            className="bg-white p-5 rounded-[2rem] border-2 border-gray-50 hover:border-[#6B7A3A] hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#1C1C1C] text-[#6B7A3A] flex items-center justify-center shadow-lg group-hover:bg-[#6B7A3A] group-hover:text-white transition-colors">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="font-black text-base leading-none mb-1 uppercase italic tracking-tighter">{sale.clientName}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Clock size={10}/> {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(sale.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-xl text-[#1C1C1C] tracking-tighter">${sale.total.toLocaleString()}</p>
              <div className="flex items-center justify-end gap-1 text-[9px] font-black uppercase text-[#6B7A3A]">
                Ver ticket <ChevronRight size={14} />
              </div>
            </div>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
             <ReceiptText size={48} className="text-gray-200 mb-4" />
             <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No encontramos ventas con esos filtros</p>
          </div>
        )}
      </div>

      {/* TICKET DETALLE */}
      {selectedSale && (
        <div className="fixed inset-0 bg-[#1C1C1C]/80 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setSelectedSale(null)}>
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slide-up border-t-8 border-[#6B7A3A]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b-2 border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="font-black text-3xl text-[#1C1C1C] tracking-tighter uppercase italic leading-none">Ticket de Venta</h3>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">ID: {selectedSale.id.substring(0,8)}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-3 hover:bg-gray-200 rounded-full text-[#1C1C1C] transition-all"><X size={28} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Cliente</p>
                    <p className="text-lg font-black text-[#1C1C1C] uppercase truncate">{selectedSale.clientName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl text-right">
                    <p className="text-[9px] uppercase font-black text-gray-400 mb-1 tracking-widest">Pago</p>
                    <p className="text-sm font-black text-[#6B7A3A] uppercase italic">{selectedSale.paymentMethod}</p>
                  </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Productos</p>
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-5 bg-white rounded-2xl border-2 border-gray-50">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-black text-[#1C1C1C] uppercase text-sm truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.quantity} x ${item.appliedPrice.toLocaleString()}</p>
                    </div>
                    <p className="font-black text-lg text-[#1C1C1C] tracking-tighter">${(item.appliedPrice * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t-4 border-[#1C1C1C] flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Total Abonado</p>
                    <p className="text-4xl font-black text-[#1C1C1C] tracking-tighter italic leading-none">${selectedSale.total.toLocaleString()}</p>
                  </div>
                  {selectedSale.balance > 0 && (
                    <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-red-500 mb-1">Pendiente</p>
                      <p className="text-xl font-black text-red-600 tracking-tighter">${selectedSale.balance.toLocaleString()}</p>
                    </div>
                  )}
              </div>
            </div>

            <div className="p-8 bg-gray-50/50 flex gap-4">
               <button 
                onClick={(e) => { e.stopPropagation(); setSaleToDelete(selectedSale); setIsDeleteModalOpen(true); }}
                className="flex-1 py-5 bg-red-50 text-red-600 rounded-[1.5rem] hover:bg-red-600 hover:text-white font-black transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
               >
                 <Trash2 size={16} /> Anular Venta
               </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN BORRAR */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full text-center border-t-8 border-red-600 shadow-2xl">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50 shadow-inner">
                <AlertTriangle size={36}/>
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">¿Anular Venta?</h3>
              <p className="text-xs text-gray-500 font-bold mb-8 leading-relaxed">
                Si confirmas, los productos volverán automáticamente al stock de inventario.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase italic shadow-xl active:scale-95 transition-all">Sí, anular y devolver stock</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-5 bg-gray-100 text-gray-900 rounded-2xl font-black uppercase">Mantener venta</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default SalesHistory;
