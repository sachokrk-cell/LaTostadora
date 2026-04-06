import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Client, Sale, PaymentRecord } from '../types';
import { User, Phone, Mail, Search, Plus, Calendar, ArrowLeft, Edit2, Trash2, X, AlertTriangle, Wallet, CheckCircle, CreditCard, ChevronRight, MessageSquare } from 'lucide-react';

const Clients = () => {
  const { clients, sales, addClient, updateClient, deleteClient, addPaymentToSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'account'>('history');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [saleToPay, setSaleToPay] = useState<Sale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');

  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '', email: '', phone: '', notes: ''
  });

  // Lógica de datos (Sin cambios en funcionalidad)
  const clientHistory = useMemo(() => {
    if (!selectedClient) return [];
    return sales
      .filter(s => s.clientId === selectedClient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, selectedClient]);

  const clientDebt = useMemo(() => {
    return clientHistory.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);
  }, [clientHistory]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).map(c => {
    const debt = sales.filter(s => s.clientId === c.id).reduce((acc, s) => acc + (Number(s.balance) || 0), 0);
    return { ...c, debt };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) return;
    if (isEditing && editingId) {
        const original = clients.find(c => c.id === editingId);
        if (original) updateClient({ ...original, name: clientForm.name, email: clientForm.email, phone: clientForm.phone, notes: clientForm.notes || '' });
    } else {
        addClient({ id: crypto.randomUUID(), name: clientForm.name!, email: clientForm.email, phone: clientForm.phone, notes: clientForm.notes || '', totalSpent: 0, createdAt: new Date().toISOString() });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 text-[#1C1C1C] animate-fade-in pb-20 md:pb-8">
      
      {/* HEADER - BOTÓN CORREGIDO */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${selectedClient ? 'hidden md:flex' : 'flex'}`}>
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Clientes</h2>
          <p className="text-[#6B7A3A] font-bold text-xs uppercase tracking-[0.2em] mt-2">La Tostadora - Base de Datos</p>
        </div>
        <button 
          onClick={() => { setClientForm({ name: '', email: '', phone: '', notes: '' }); setIsEditing(false); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-[#1C1C1C] text-[#E8DFC8] px-8 py-4 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-xl hover:bg-[#6B7A3A] transition-all active:scale-95 font-black uppercase italic tracking-tighter border-b-4 border-[#000]"
        >
          <Plus size={20} className="text-[#6B7A3A]" /> Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LISTADO DE CLIENTES */}
        <div className={`space-y-4 ${selectedClient ? 'hidden lg:block' : 'block'}`}>
          <div className="relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#6B7A3A] transition-colors" size={20} />
             <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] outline-none font-bold focus:border-[#6B7A3A] focus:bg-white transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
            {filteredClients.map(client => (
              <div 
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`p-5 rounded-[2rem] cursor-pointer transition-all flex items-center justify-between border-2 ${selectedClient?.id === client.id ? 'bg-[#1C1C1C] border-[#1C1C1C] text-white shadow-xl scale-[1.02]' : 'bg-white border-gray-50 hover:border-gray-200'}`}
              >
                <div className="min-w-0">
                   <h3 className={`font-black text-lg truncate uppercase italic ${selectedClient?.id === client.id ? 'text-[#E8DFC8]' : 'text-[#1C1C1C]'}`}>{client.name}</h3>
                   <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedClient?.id === client.id ? 'text-gray-400' : 'text-gray-400'}`}>{client.phone || 'Sin contacto'}</p>
                </div>
                <div className="text-right">
                   <p className={`text-xl font-black ${client.debt > 0 ? 'text-red-500' : (selectedClient?.id === client.id ? 'text-[#6B7A3A]' : 'text-[#6B7A3A]')}`}>
                     ${(client.debt > 0 ? client.debt : client.totalSpent).toLocaleString()}
                   </p>
                   <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">{client.debt > 0 ? 'Deuda' : 'Consumo'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FICHA DETALLE (MOBILE-FIRST FULLSCREEN) */}
        <div className={`lg:col-span-2 ${selectedClient ? 'fixed inset-0 z-[100] bg-white flex flex-col lg:static lg:bg-transparent lg:z-0' : 'hidden lg:flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 h-[600px]'}`}>
           {selectedClient ? (
             <div className="flex flex-col h-full lg:bg-white lg:rounded-[3rem] lg:border-2 lg:border-gray-50 lg:shadow-sm overflow-hidden">
               
               {/* HEADER FICHA */}
               <div className="p-6 bg-[#1C1C1C] text-white lg:rounded-t-[2.8rem] border-b-8 border-[#6B7A3A]">
                 <button onClick={() => setSelectedClient(null)} className="flex items-center gap-2 text-[#6B7A3A] font-black text-[10px] uppercase tracking-[0.2em] mb-4 hover:translate-x-[-4px] transition-transform">
                   <ArrowLeft size={16} /> Volver al listado
                 </button>
                 
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 bg-[#6B7A3A] rounded-[2rem] flex items-center justify-center text-[#1C1C1C] text-4xl font-black shadow-lg">
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#E8DFC8]">{selectedClient.name}</h2>
                        <div className="flex flex-wrap gap-4 mt-2">
                           <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><Phone size={12}/> {selectedClient.phone || 'N/A'}</span>
                           <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><Mail size={12}/> {selectedClient.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className={`flex-1 md:min-w-[150px] p-4 rounded-2xl border-2 flex flex-col items-center justify-center ${clientDebt > 0 ? 'bg-red-600 border-red-600 text-white' : 'bg-[#E8DFC8] border-[#E8DFC8] text-[#1C1C1C]'}`}>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Saldo Cuenta</span>
                          <span className="text-2xl font-black tracking-tighter">${clientDebt.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => { setClientForm(selectedClient); setEditingId(selectedClient.id); setIsEditing(true); setIsModalOpen(true); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"><Edit2 size={18} /></button>
                          <button onClick={() => setIsDeleteModalOpen(true)} className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-xl transition-all border border-red-500/20 text-red-500"><Trash2 size={18} /></button>
                        </div>
                    </div>
                 </div>
               </div>

               {/* TABS */}
               <div className="flex bg-gray-50 px-6 border-b">
                  <button onClick={() => setActiveTab('history')} className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'history' ? 'border-[#6B7A3A] text-[#1C1C1C]' : 'border-transparent text-gray-400'}`}>Compras</button>
                  <button onClick={() => setActiveTab('account')} className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest transition-all border-b-4 ${activeTab === 'account' ? 'border-red-500 text-[#1C1C1C]' : 'border-transparent text-gray-400'}`}>Cuenta Corriente</button>
               </div>

               {/* CONTENIDO FICHA */}
               <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                  {activeTab === 'history' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                      {clientHistory.map(sale => (
                        <div key={sale.id} className="bg-gray-50 p-5 rounded-[2rem] border-2 border-transparent hover:border-[#6B7A3A]/20 transition-all">
                           <div className="flex justify-between items-start mb-4">
                              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"><Calendar size={12}/> {new Date(sale.date).toLocaleDateString()}</span>
                              <span className="text-xl font-black text-[#1C1C1C]">${sale.total.toLocaleString()}</span>
                           </div>
                           <div className="space-y-1">
                              {sale.items.map((i, idx) => (
                                <p key={idx} className="text-[11px] font-bold text-gray-600 flex justify-between"><span>{i.quantity}x {i.name}</span> <span className="text-[#6B7A3A]">${(i.appliedPrice * i.quantity).toLocaleString()}</span></p>
                              ))}
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 pb-20">
                       {clientHistory.filter(s => s.balance > 0).map(sale => (
                         <div key={sale.id} className="bg-white border-2 border-red-50 p-6 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm border-l-8 border-l-red-500">
                            <div className="w-full md:w-auto">
                               <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 block">Ticket Pendiente</span>
                               <h4 className="font-black text-[#1C1C1C] text-lg uppercase leading-none mb-1">{new Date(sale.date).toLocaleDateString()}</h4>
                               <p className="text-[10px] font-bold text-gray-400 uppercase">{sale.items.length} productos registrados</p>
                            </div>
                            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                               <div className="text-right">
                                  <p className="text-[10px] font-black text-gray-400 uppercase">Saldo a Pagar</p>
                                  <p className="text-3xl font-black text-red-600 tracking-tighter">${sale.balance.toLocaleString()}</p>
                               </div>
                               <button onClick={() => { setSaleToPay(sale); setPaymentAmount(sale.balance); setIsPaymentModalOpen(true); }} className="bg-[#1C1C1C] text-[#E8DFC8] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#6B7A3A] transition-all shadow-lg">
                                 <Wallet size={16} /> Cobrar
                               </button>
                            </div>
                         </div>
                       ))}
                       {clientHistory.filter(s => s.balance > 0).length === 0 && (
                         <div className="py-20 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
                            <CheckCircle size={48} className="mx-auto text-[#6B7A3A] mb-4 opacity-20" />
                            <p className="text-gray-400 font-black uppercase text-xs tracking-widest">El cliente no tiene deudas</p>
                         </div>
                       )}
                    </div>
                  )}
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center">
                <User size={64} className="text-gray-200 mb-4" />
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-400">Selecciona un cliente</h3>
                <p className="text-gray-300 font-bold text-xs uppercase tracking-widest mt-2">Para ver su ficha técnica y deuda</p>
             </div>
           )}
        </div>
      </div>

      {/* MODAL COBRAR DEUDA (SOLUCIÓN RESPONSIVA) */}
      {isPaymentModalOpen && saleToPay && (
        <div className="fixed inset-0 bg-[#1C1C1C]/90 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
           <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-md p-8 animate-slide-up border-t-8 border-red-500">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#1C1C1C]">Registrar Cobro</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 text-[#1C1C1C]"><X size={28}/></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                addPaymentToSale(saleToPay.id, { id: crypto.randomUUID(), date: new Date().toISOString(), amount: Math.min(paymentAmount, saleToPay.balance), method: paymentMethod });
                setIsPaymentModalOpen(false);
              }} className="space-y-6">
                 <div className="bg-red-50 p-6 rounded-[2rem] text-center border-2 border-red-100">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 block">Deuda Actual</span>
                    <p className="text-4xl font-black text-red-600 tracking-tighter">${saleToPay.balance.toLocaleString()}</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Monto a Entregar ($)</label>
                    <input required autoFocus type="number" step="0.01" max={saleToPay.balance} className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl font-black text-3xl text-center outline-none focus:border-[#6B7A3A]" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPaymentMethod('Efectivo')} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Efectivo' ? 'bg-[#1C1C1C] border-[#1C1C1C] text-[#E8DFC8]' : 'bg-white border-gray-100 text-gray-400'}`}><Wallet size={18}/> Efectivo</button>
                    <button type="button" onClick={() => setPaymentMethod('Transferencia')} className={`p-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Transferencia' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}><CreditCard size={18}/> Transfer</button>
                 </div>
                 <button type="submit" className="w-full py-6 bg-[#6B7A3A] text-white rounded-[2rem] font-black text-xl uppercase italic shadow-2xl active:scale-95 transition-all">Confirmar Cobro</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1C1C1C]/90 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
           <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-md p-8 animate-slide-up border-t-8 border-[#6B7A3A]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#1C1C1C]">{isEditing ? 'Editar Perfil' : 'Nuevo Cliente'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#1C1C1C]"><X size={28}/></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                 <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Completo</label>
                    <input required type="text" placeholder="Ej: Julian Gomez" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-black outline-none focus:border-[#6B7A3A]" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Teléfono</label>
                    <input type="text" placeholder="+54 9..." className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-black outline-none focus:border-[#6B7A3A]" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Preferencias / Notas</label>
                    <textarea rows={3} placeholder="Notas del cliente..." className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-black outline-none focus:border-[#6B7A3A]" value={clientForm.notes} onChange={e => setClientForm({...clientForm, notes: e.target.value})} />
                 </div>
                 <button type="submit" className="w-full py-6 bg-[#1C1C1C] text-[#E8DFC8] rounded-[2rem] font-black text-xl uppercase italic shadow-2xl active:scale-95 transition-all border-b-8 border-black">
                   {isEditing ? 'Actualizar Ficha' : 'Guardar Cliente'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* CONFIRMACIÓN ELIMINAR */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center border-t-8 border-red-600 shadow-2xl">
              <AlertTriangle className="mx-auto text-red-600 mb-4" size={56}/>
              <h3 className="text-xl font-black uppercase mb-2 italic tracking-tighter">¿Borrar Cliente?</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8 leading-relaxed">Se perderá la trazabilidad de su cuenta corriente de forma permanente.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { deleteClient(selectedClient!.id); setSelectedClient(null); setIsDeleteModalOpen(false); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Confirmar Eliminación</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-5 bg-gray-100 text-gray-900 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Clients;
