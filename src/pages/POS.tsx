import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CartItem, Client } from '../types';
import { 
  Search, Plus, Minus, Trash, User, ShoppingCart, 
  CheckCircle, ArrowLeft, X, ShoppingBag as ShoppingBagIcon, 
  Wallet, CreditCard, AlertCircle, ChevronRight 
} from 'lucide-react';

// --- SUB-COMPONENTE: CONTENIDO DEL CARRITO ---
interface CartContentProps {
  cart: CartItem[];
  selectedClient: Client | null;
  saleDate: string;
  discount: number;
  subtotal: number;
  total: number;
  totalItems: number;
  successMsg: string;
  paymentMethod: 'Efectivo' | 'Transferencia';
  amountPaid: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onSetSelectedClient: (client: Client | null) => void;
  onShowClientModal: () => void;
  onSetSaleDate: (date: string) => void;
  onSetDiscount: (val: number) => void;
  onSetPaymentMethod: (method: 'Efectivo' | 'Transferencia') => void;
  onSetAmountPaid: (val: number) => void;
  onCheckout: () => void;
  onCloseMobileCart: () => void;
}

const CartContent: React.FC<CartContentProps> = ({
  cart, selectedClient, saleDate, discount, subtotal, total, totalItems, successMsg,
  paymentMethod, amountPaid,
  onUpdateQuantity, onRemoveFromCart, onSetSelectedClient, onShowClientModal,
  onSetDiscount, onSetPaymentMethod, onSetAmountPaid, onCheckout, onCloseMobileCart
}) => {
  const balance = total - amountPaid;
  const isDebt = balance > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* HEADER DEL CARRITO */}
      <div className="p-6 bg-[#1C1C1C] text-white flex-shrink-0 border-b-4 border-[#6B7A3A]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onCloseMobileCart} className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <ShoppingCart size={20} className="text-[#6B7A3A]" /> Orden
            </h2>
          </div>
          <span className="bg-[#6B7A3A] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
            {totalItems} Items
          </span>
        </div>

        <div className="mt-6">
          {selectedClient ? (
              <div className="flex items-center justify-between bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-[#6B7A3A] flex items-center justify-center text-[10px] font-black">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <span className="truncate font-black text-sm uppercase tracking-tight">{selectedClient.name}</span>
                </div>
                <button onClick={() => onSetSelectedClient(null)} className="p-2 hover:text-red-400 transition-colors">
                  <X size={18} />
                </button>
              </div>
          ) : (
            <button onClick={onShowClientModal} className="w-full py-3 px-4 bg-[#6B7A3A] hover:bg-[#5a6932] rounded-2xl transition-all border-b-4 border-[#4d5828] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <User size={14} /> Seleccionar Cliente
            </button>
          )}
        </div>
      </div>

      {/* ITEMS DEL CARRITO */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <ShoppingBagIcon size={64} className="mb-4" />
              <p className="font-black uppercase text-xs tracking-[0.2em]">Carrito Vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 group">
                <div className="flex-1 min-w-0 mr-4">
                  <h4 className="font-black text-[#1C1C1C] truncate text-sm uppercase leading-none mb-1">{item.name}</h4>
                  <p className="text-[10px] text-[#6B7A3A] font-black uppercase">${item.appliedPrice.toLocaleString()} c/u</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-[#1C1C1C]"><Minus size={14} /></button>
                    <span className="font-black w-8 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 text-[#1C1C1C]"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => onRemoveFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash size={18} /></button>
                </div>
              </div>
            ))
          )}
      </div>

      {/* RESUMEN Y PAGO */}
      <div className="p-6 bg-gray-50 border-t-2 border-gray-100 space-y-6 flex-shrink-0">
        <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onSetPaymentMethod('Efectivo')}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${paymentMethod === 'Efectivo' ? 'border-[#6B7A3A] bg-white shadow-md text-[#6B7A3A]' : 'border-gray-200 text-gray-400 opacity-50'}`}
            >
              <Wallet size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Efectivo</span>
            </button>
            <button 
              onClick={() => onSetPaymentMethod('Transferencia')}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${paymentMethod === 'Transferencia' ? 'border-[#1C1C1C] bg-white shadow-md text-[#1C1C1C]' : 'border-gray-200 text-gray-400 opacity-50'}`}
            >
              <CreditCard size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Transfer</span>
            </button>
        </div>

        <div className="bg-white p-4 rounded-[2rem] border-2 border-gray-100 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Monto Recibido</span>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                    <input 
                       type="number"
                       className="w-32 pl-7 pr-4 py-2 border-2 border-gray-100 rounded-xl text-right font-black text-lg text-[#1C1C1C] outline-none focus:border-[#6B7A3A] transition-all"
                       value={amountPaid === 0 ? '' : amountPaid}
                       placeholder={total.toString()}
                       onChange={(e) => onSetAmountPaid(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                </div>
            </div>

            {isDebt && (
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100 animate-pulse">
                    <span className="text-[10px] text-red-600 font-black uppercase flex items-center gap-1"><AlertCircle size={14}/> Saldo a Deber</span>
                    <span className="text-sm text-red-600 font-black">${balance.toLocaleString()}</span>
                </div>
            )}

            <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-400 font-bold">
                  <span className="uppercase tracking-widest">Descuento</span>
                  <input 
                    type="number" 
                    value={discount === 0 ? '' : discount} 
                    onChange={e => onSetDiscount(Number(e.target.value))}
                    className="w-16 text-right font-black text-[#6B7A3A] outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase text-[#1C1C1C] tracking-widest">Total a Cobrar</span>
                  <span className="text-4xl font-black text-[#1C1C1C] tracking-tighter leading-none">${total.toLocaleString()}</span>
                </div>
            </div>
        </div>
        
        <button 
          disabled={cart.length === 0 || (isDebt && !selectedClient)}
          onClick={onCheckout}
          className={`w-full py-6 rounded-[2rem] font-black text-xl shadow-xl flex flex-col justify-center items-center gap-1 transition-all active:scale-95 ${cart.length > 0 && !(isDebt && !selectedClient) ? 'bg-[#1C1C1C] text-[#E8DFC8] hover:bg-[#6B7A3A]' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
        >
          <div className="flex items-center gap-3">
            {successMsg ? <CheckCircle size={28} /> : 'Confirmar Venta'}
          </div>
          {isDebt && !selectedClient && (
            <span className="text-[8px] uppercase tracking-widest text-red-500 font-black">Asigna un cliente para el saldo</span>
          )}
          {successMsg && <span className="text-xs font-black italic">{successMsg}</span>}
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL: PUNTO DE VENTA ---
const POS = () => {
  const { products, clients, addSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]); 
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  
  const [showClientModal, setShowClientModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.appliedPrice * item.quantity), 0), [cart]);
  const total = subtotal - discount;
  const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  useEffect(() => {
    setAmountPaid(total);
  }, [total]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (product.stock <= existing.quantity) {
            alert('Sin stock disponible');
            return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, appliedPrice: product.sellingPrice }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        const product = products.find(p => p.id === id);
        if (product && product.stock < newQty) {
          alert('Stock insuficiente');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    if (cart.length <= 1) setIsMobileCartOpen(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const balance = total - amountPaid;
    
    if (balance > 0 && !selectedClient) {
        alert("Debe seleccionar un cliente para registrar una deuda.");
        return;
    }

    const checkoutDate = new Date(saleDate);
    const now = new Date();
    checkoutDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    try {
        await addSale({
            id: crypto.randomUUID(),
            clientId: selectedClient ? selectedClient.id : null,
            clientName: selectedClient ? selectedClient.name : 'Consumidor Final',
            date: checkoutDate.toISOString(),
            items: cart,
            subtotal,
            discountAmount: discount,
            total,
            paymentMethod,
            amountPaid: amountPaid,
            balance: balance,
            payments: amountPaid > 0 ? [{
              id: crypto.randomUUID(),
              date: checkoutDate.toISOString(),
              amount: amountPaid,
              method: paymentMethod
            }] : []
          });
      
          setSuccessMsg('¡VENTA EXITOSA! ☕');
          setCart([]);
          setSelectedClient(null);
          setDiscount(0);
          setAmountPaid(0);
          setTimeout(() => {
              setSuccessMsg('');
              setIsMobileCartOpen(false);
          }, 2000);
    } catch (error) {
        alert("Error al procesar la venta. Intente de nuevo.");
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredClients = useMemo(() => clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())), [clients, clientSearchTerm]);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-white overflow-hidden relative">
      
      {/* AREA DE SELECCIÓN DE PRODUCTOS */}
      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden bg-white">
        <div className="mb-6">
          <div className="relative group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#6B7A3A] transition-colors" size={24} />
             <input 
              className="w-full pl-14 pr-6 py-5 rounded-[2rem] border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-[#6B7A3A] shadow-sm text-lg font-bold outline-none transition-all text-[#1C1C1C]" 
              placeholder="Buscar por variedad o categoría..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* NUEVA GRILLA CON TARJETAS VERTICALES PARA EVITAR SUPERPOSICIÓN */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pb-32 custom-scrollbar">
          {filteredProducts.map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`bg-white p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center shadow-sm hover:shadow-md active:scale-[0.98] group ${product.stock <= 0 ? 'opacity-30 grayscale cursor-not-allowed border-gray-100' : 'border-gray-50 hover:border-[#6B7A3A]'}`}
            >
              {/* Imagen centrada arriba */}
              <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden mb-3 flex-shrink-0 shadow-inner border border-gray-200">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              </div>

              {/* Título en dos líneas */}
              <h3 className="font-black text-[#1C1C1C] text-xs uppercase leading-tight mb-2 line-clamp-2 min-h-[2rem]">
                {product.name}
              </h3>

              {/* Botonera inferior: Precio + Stock a la izquierda, botón de más a la derecha */}
              <div className="flex items-center justify-between w-full mt-auto bg-gray-50 p-2 rounded-[1.2rem] group-hover:bg-gray-100 transition-colors">
                <div className="flex flex-col text-left pl-2">
                  <p className="text-lg font-black text-[#6B7A3A] leading-none">
                    ${product.sellingPrice.toLocaleString()}
                  </p>
                  <p className={`text-[9px] font-black uppercase mt-1 ${product.stock > 10 ? 'text-green-600' : 'text-red-500'}`}>
                    Stock: {product.stock}
                  </p>
                </div>
                
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1C1C1C] group-hover:bg-[#6B7A3A] group-hover:text-white transition-colors shadow-sm flex-shrink-0">
                  <Plus size={20} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CARRITO PARA ESCRITORIO (SIDEBAR) */}
      <div className="hidden md:flex w-[400px] bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.03)] flex-col border-l-2 border-gray-50 z-10">
         <CartContent 
            cart={cart}
            selectedClient={selectedClient}
            saleDate={saleDate}
            discount={discount}
            subtotal={subtotal}
            total={total}
            totalItems={totalItems}
            successMsg={successMsg}
            paymentMethod={paymentMethod}
            amountPaid={amountPaid}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onSetSelectedClient={setSelectedClient}
            onShowClientModal={() => setShowClientModal(true)}
            onSetSaleDate={setSaleDate}
            onSetDiscount={setDiscount}
            onSetPaymentMethod={setPaymentMethod}
            onSetAmountPaid={setAmountPaid}
            onCheckout={handleCheckout}
            onCloseMobileCart={() => setIsMobileCartOpen(false)}
         />
      </div>

      {/* BOTÓN FLOTANTE MÓVIL */}
      {cart.length > 0 && !isMobileCartOpen && (
          <div className="md:hidden fixed bottom-24 right-6 left-6 z-[100] animate-bounce-in">
            <button 
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full bg-[#1C1C1C] text-white rounded-[2rem] py-5 px-8 shadow-2xl flex justify-between items-center border-b-8 border-[#6B7A3A] active:scale-95 transition-all"
            >
               <div className="flex items-center gap-3">
                 <div className="bg-[#6B7A3A] text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg">
                    {totalItems}
                 </div>
                 <span className="font-black uppercase tracking-widest text-sm">Ver Carrito</span>
               </div>
               <span className="font-black text-2xl tracking-tighter">${total.toLocaleString()}</span>
            </button>
          </div>
      )}

      {/* CARRITO MÓVIL (OVERLAY FULLSCREEN) */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-[110] flex flex-col animate-slide-up">
           <CartContent 
                cart={cart}
                selectedClient={selectedClient}
                saleDate={saleDate}
                discount={discount}
                subtotal={subtotal}
                total={total}
                totalItems={totalItems}
                successMsg={successMsg}
                paymentMethod={paymentMethod}
                amountPaid={amountPaid}
                onUpdateQuantity={updateQuantity}
                onRemoveFromCart={removeFromCart}
                onSetSelectedClient={setSelectedClient}
                onShowClientModal={() => setShowClientModal(true)}
                onSetSaleDate={setSaleDate}
                onSetDiscount={setDiscount}
                onSetPaymentMethod={setPaymentMethod}
                onSetAmountPaid={setAmountPaid}
                onCheckout={handleCheckout}
                onCloseMobileCart={() => setIsMobileCartOpen(false)}
           />
        </div>
      )}

      {/* MODAL SELECCIONAR CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 bg-[#1C1C1C]/90 flex items-end sm:items-center justify-center z-[150] p-0 sm:p-4 backdrop-blur-md">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-slide-up border-t-8 border-[#6B7A3A]">
             <div className="p-8 flex justify-between items-center">
               <h3 className="font-black text-2xl text-[#1C1C1C] uppercase italic tracking-tighter leading-none">Clientes</h3>
               <button onClick={() => {setShowClientModal(false); setClientSearchTerm('');}} className="p-3 hover:bg-gray-100 rounded-full transition-all text-[#1C1C1C]"><X size={28}/></button>
             </div>
             
             <div className="px-8 mb-6">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                 <input 
                    autoFocus
                    type="text" 
                    placeholder="Nombre del cliente..." 
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-[#6B7A3A] outline-none text-[#1C1C1C] font-bold transition-all"
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                 />
               </div>
             </div>

             <div className="overflow-y-auto flex-1 px-8 pb-8 custom-scrollbar">
               <div className="space-y-3">
                 {filteredClients.map(c => (
                   <div 
                     key={c.id} 
                     onClick={() => { setSelectedClient(c); setShowClientModal(false); setClientSearchTerm(''); }}
                     className="p-5 bg-gray-50 hover:bg-[#6B7A3A] group cursor-pointer rounded-2xl transition-all border-2 border-transparent hover:border-[#6B7A3A] flex justify-between items-center"
                   >
                     <div className="min-w-0">
                       <p className="font-black text-[#1C1C1C] group-hover:text-white uppercase text-sm truncate transition-colors">{c.name}</p>
                       <p className="text-[10px] text-gray-400 group-hover:text-white/60 font-bold uppercase transition-colors">{c.phone || 'Sin número'}</p>
                     </div>
                     <ChevronRight size={20} className="text-gray-300 group-hover:text-white transition-colors" />
                   </div>
                 ))}
                 {filteredClients.length === 0 && (
                   <div className="text-center py-20 text-gray-300 font-black uppercase text-xs tracking-widest italic">
                     No hay coincidencias
                   </div>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
