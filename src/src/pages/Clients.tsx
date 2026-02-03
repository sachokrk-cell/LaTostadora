
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Client, Sale, PaymentRecord } from '../types';
import { User, Phone, Mail, Search, Plus, Calendar, ArrowLeft, Edit2, Trash2, X, AlertTriangle, Wallet, CheckCircle, CreditCard } from 'lucide-react';

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
    name: '',
    email: '',
    phone: '',
    notes: ''
  });

  const clientHistory = useMemo(() => {
    if (!selectedClient) return [];
    return sales
      .filter(s => s.clientId === selectedClient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, selectedClient]);

  const clientDebt = useMemo(() => {
    return clientHistory.reduce((acc, s) => acc + (Number(s.balance) || 0), 0);
  }, [clientHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name) return;
    
    if (isEditing && editingId) {
        const original = clients.find(c => c.id === editingId);
        if (original) {
            updateClient({
                ...original,
                name: clientForm.name,
                email: clientForm.email,
                phone: clientForm.phone,
                notes: clientForm.notes || '',
            });
            if(selectedClient?.id === editingId) {
                setSelectedClient({
                    ...original,
                    name: clientForm.name,
                    email: clientForm.email,
                    phone: clientForm.phone,
                    notes: clientForm.notes || '',
                    totalSpent: original.totalSpent,
                    createdAt: original.createdAt
                });
            }
        }
    } else {
        addClient({
            id: crypto.randomUUID(),
            name: clientForm.name!,
            email: clientForm.email,
            phone: clientForm.phone,
            notes: clientForm.notes || '',
            totalSpent: 0,
            createdAt: new Date().toISOString()
        });
    }
    closeModal();
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToPay || paymentAmount <= 0) return;
    
    const payment: PaymentRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        amount: Math.min(paymentAmount, saleToPay.balance),
        method: paymentMethod
    };
    
    addPaymentToSale(saleToPay.id, payment);
    setIsPaymentModalOpen(false);
    setSaleToPay(null);
  };

  const openNewClientModal = () => {
      setClientForm({ name: '', email: '', phone: '', notes: '' });
      setIsEditing(false);
      setEditingId(null);
      setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
      setClientForm({
          name: client.name,
          email: client.email,
          phone: client.phone,
          notes: client.notes
      });
      setEditingId(client.id);
      setIsEditing(true);
      setIsModalOpen(true);
  };

  const openPaymentModal = (sale: Sale) => {
    setSaleToPay(sale);
    setPaymentAmount(sale.balance);
    setIsPaymentModalOpen(true);
  };

  const confirmDelete = () => {
      if (selectedClient) {
          deleteClient(selectedClient.id);
          setSelectedClient(null);
          setIsDeleteModalOpen(false);
      }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).map(c => {
    const debt = sales.filter(s => s.clientId === c.id).reduce((acc, s) => acc + (Number(s.balance) || 0), 0);
    return { ...c, debt };
  });

  return (
    <div className="p-4 md:p-8 h-full flex flex-col relative">
      <div className={`flex justify-between items-center mb-6 ${selectedClient ? 'hidden md:flex' : ''}`}>
        <h2 className="text-2xl md:text-3xl font-bold text-coffee-900">Clientes</h2>
        <button 
          onClick={openNewClientModal} 
          className="bg-coffee-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-coffee-700 transition-all shadow-md active:scale-95 font-bold"
        >
          <Plus size={20} /> <span className="hidden sm:inline">Nuevo Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Client List */}
        <div className={`bg-white rounded-2xl shadow-md flex flex-col overflow-hidden border border-gray-100 ${selectedClient ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b">
            <div className="relative">
               <Search className="absolute left-3 top-3 text-gray-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar cliente..." 
                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coffee-500 transition-all text-gray-900 font-bold"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {filteredClients.map(client => (
              <div 
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between group border-2 ${selectedClient?.id === client.id ? 'bg-coffee-50 border-coffee-400 shadow-sm' : 'bg-white border-transparent hover:border-gray-100 hover:bg-gray-50'}`}
              >
                <div className="min-w-0">
                   <h3 className="font-bold text-gray-800 group-hover:text-coffee-700 transition-colors truncate">{client.name}</h3>
                   <div className="flex gap-2">
                     <span className="text-[10px] text-gray-400 font-bold uppercase">{client.email || client.phone || 'Sin contacto'}</span>
                     {client.debt > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-black">DEBE</span>}
                   </div>
                </div>
                <div className="text-right flex-shrink-0">
                   <span className={`block font-black text-sm ${client.debt > 0 ? 'text-red-600' : 'text-coffee-700'}`}>${(client.debt > 0 ? client.debt : client.totalSpent).toLocaleString()}</span>
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{client.debt > 0 ? 'Deuda' : 'Gastado'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client Detail */}
        <div className={`lg:col-span-2 bg-white rounded-2xl shadow-md flex flex-col overflow-hidden border border-gray-100 ${selectedClient ? 'fixed inset-0 z-[60] md:z-0 m-0 rounded-none lg:static lg:rounded-2xl flex' : 'hidden lg:flex'}`}>
           {selectedClient ? (
             <div className="flex flex-col h-full bg-white animate-fade-in relative">
               <div className="p-4 md:p-6 border-b bg-gray-50 flex-shrink-0">
                 <button 
                    onClick={() => setSelectedClient(null)} 
                    className="mb-4 flex items-center gap-2 text-coffee-600 font-black hover:text-coffee-800 transition-all w-fit text-sm uppercase tracking-widest cursor-pointer p-2 -ml-2 hover:bg-coffee-50 rounded-lg"
                 >
                    <ArrowLeft size={20} /> Volver a la lista
                 </button>

                 <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-coffee-600 to-coffee-800 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedClient.name}</h2>
                        <div className="flex flex-col md:flex-row gap-1 md:gap-4 mt-1 text-xs text-gray-500 font-bold">
                          {selectedClient.phone && <span className="flex items-center gap-1"><Phone size={12}/> {selectedClient.phone}</span>}
                          {selectedClient.email && <span className="flex items-center gap-1"><Mail size={12}/> {selectedClient.email}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className={`px-4 py-2 rounded-2xl border flex flex-col items-center flex-1 md:min-w-[120px] ${clientDebt > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                           <span className="text-[10px] font-black uppercase text-gray-400">Saldo Pendiente</span>
                           <span className={`text-lg font-black ${clientDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>${clientDebt.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                           <button onClick={() => handleEdit(selectedClient)} className="p-2 bg-white text-gray-600 rounded-xl hover:bg-gray-100 border border-gray-200 shadow-sm"><Edit2 size={16} /></button>
                           <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 bg-white text-red-600 rounded-xl hover:bg-red-50 border border-red-100 shadow-sm"><Trash2 size={16} /></button>
                        </div>
                    </div>
                 </div>
               </div>

               {/* Tabs */}
               <div className="flex bg-white px-4 pt-4 border-b flex-shrink-0">
                  <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-black text-sm transition-all border-b-4 ${activeTab === 'history' ? 'border-coffee-600 text-coffee-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    Historial de Compras
                  </button>
                  <button 
                    onClick={() => setActiveTab('account')}
                    className={`px-4 py-2 font-black text-sm transition-all border-b-4 ${activeTab === 'account' ? 'border-red-500 text-red-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    Cuenta Corriente (Deudas)
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30">
                 {activeTab === 'history' ? (
                    <div className="space-y-4 pb-10">
                        {clientHistory.map(sale => (
                        <div key={sale.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-500 text-xs flex items-center gap-1">
                                    <Calendar size={14} /> {new Date(sale.date).toLocaleDateString()}
                                </span>
                                <span className="font-black text-coffee-600">${(Number(sale.total) || 0).toLocaleString()}</span>
                            </div>
                            <div className="text-[11px] text-gray-600 space-y-1">
                                {(sale.items || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span className="font-bold">${((Number(item.appliedPrice) || 0) * (Number(item.quantity) || 0)).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        ))}
                    </div>
                 ) : (
                    <div className="space-y-4 pb-10">
                        {clientHistory.filter(s => (Number(s.balance) || 0) > 0).map(sale => (
                            <div key={sale.id} className="bg-white border-2 border-red-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
                                <div className="space-y-1 w-full md:w-auto">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg uppercase tracking-tighter">Venta Pendiente</span>
                                        <span className="text-xs text-gray-400 font-bold">{new Date(sale.date).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-800">{(sale.items || []).map(i => i.name).join(', ')}</h4>
                                    <div className="flex gap-4 text-xs font-bold">
                                        <span className="text-gray-400">Total: ${ (Number(sale.total) || 0).toLocaleString()}</span>
                                        <span className="text-green-600">Pagado: ${ (Number(sale.amountPaid) || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase">A Cobrar</p>
                                        <p className="text-2xl font-black text-red-600">${(Number(sale.balance) || 0).toLocaleString()}</p>
                                    </div>
                                    <button 
                                        onClick={() => openPaymentModal(sale)}
                                        className="bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 transition-all shadow-md font-black flex items-center gap-2 active:scale-95"
                                    >
                                        <Wallet size={18} /> COBRAR
                                    </button>
                                </div>
                            </div>
                        ))}
                        {clientHistory.filter(s => (Number(s.balance) || 0) > 0).length === 0 && (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                <CheckCircle size={48} className="mx-auto text-green-200 mb-4" />
                                <h4 className="text-lg font-bold text-gray-400">Sin deudas pendientes</h4>
                                <p className="text-xs text-gray-400">Este cliente está al día con sus cuentas.</p>
                            </div>
                        )}
                    </div>
                 )}
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center bg-gray-50/50">
               <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User size={48} className="opacity-20 text-gray-500" />
               </div>
               <h3 className="text-lg font-bold text-gray-600">Ficha de Cliente</h3>
               <p className="max-w-xs mx-auto mt-2 text-xs font-bold leading-relaxed uppercase tracking-widest opacity-60">Selecciona un cliente de la lista para gestionar sus compras y deudas.</p>
             </div>
           )}
        </div>
      </div>

      {/* REGISTRAR PAGO MODAL */}
      {isPaymentModalOpen && saleToPay && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-gray-100">
                <div className="p-8 pb-4 flex justify-between items-center">
                    <h3 className="font-black text-2xl text-coffee-900">Cobrar Deuda</h3>
                    <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-800 p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <form onSubmit={handleRegisterPayment} className="p-8 pt-4 space-y-6">
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Saldo Pendiente en esta Venta</span>
                        <p className="text-4xl font-black text-red-600">${(Number(saleToPay.balance) || 0).toLocaleString()}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">Monto a Abonar</label>
                            <input 
                                required autoFocus type="number" step="0.01" max={saleToPay.balance}
                                className="w-full text-3xl font-black text-center p-4 border-2 border-gray-200 rounded-2xl focus:border-coffee-500 outline-none transition-all bg-gray-50 text-coffee-900" 
                                value={paymentAmount === 0 ? '' : paymentAmount} 
                                onChange={e => setPaymentAmount(Number(e.target.value))} 
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">Método de Cobro</label>
                            <div className="flex gap-3">
                                <button 
                                    type="button" onClick={() => setPaymentMethod('Efectivo')}
                                    className={`flex-1 py-3 rounded-xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Efectivo' ? 'bg-coffee-600 border-coffee-600 text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                >
                                    <Wallet size={16}/> Efectivo
                                </button>
                                <button 
                                    type="button" onClick={() => setPaymentMethod('Transferencia')}
                                    className={`flex-1 py-3 rounded-xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === 'Transferencia' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                >
                                    <CreditCard size={16}/> Transfer
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="w-full py-5 bg-green-600 text-white rounded-[1.5rem] font-black text-xl hover:bg-green-700 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                    >
                        <CheckCircle size={24}/> CONFIRMAR COBRO
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-gray-200">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-black text-lg text-coffee-900">{isEditing ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}</h3>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-800 p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-1 uppercase tracking-widest">Nombre Completo <span className="text-red-500">*</span></label>
                        <input required autoFocus placeholder="Ej. Juan Pérez" className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-coffee-500 outline-none transition-all bg-white text-gray-900 font-bold" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-1 uppercase tracking-widest">Teléfono</label>
                        <input placeholder="Ej. +54 9 11..." className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-coffee-500 outline-none transition-all bg-white text-gray-900 font-bold" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-1 uppercase tracking-widest">Email</label>
                        <input type="email" placeholder="cliente@email.com" className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-coffee-500 outline-none transition-all bg-white text-gray-900 font-bold" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-1 uppercase tracking-widest">Notas / Preferencias</label>
                        <textarea placeholder="Gustos, alérgenos, etc..." className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-coffee-500 outline-none transition-all bg-white text-gray-900 font-bold" rows={3} value={clientForm.notes} onChange={e => setClientForm({...clientForm, notes: e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-400 font-bold hover:text-gray-600">Cancelar</button>
                        <button type="submit" className="px-8 py-3 bg-coffee-600 text-white rounded-xl hover:bg-coffee-700 transition-all font-black shadow-lg">{isEditing ? 'ACTUALIZAR' : 'GUARDAR CLIENTE'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up border border-gray-200">
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <AlertTriangle size={32} />
                 </div>
                 <h3 className="text-xl font-black text-gray-900 mb-2">¿Eliminar Cliente?</h3>
                 <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    Estás a punto de eliminar a <span className="font-bold text-gray-800">{selectedClient.name}</span>.<br/> 
                    Esta acción no eliminará sus ventas pasadas, pero se perderá su registro de cuenta corriente.
                 </p>
                 <div className="flex gap-3 justify-center">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold">Cancelar</button>
                    <button onClick={confirmDelete} className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-black shadow-lg">SÍ, ELIMINAR</button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Clients;
