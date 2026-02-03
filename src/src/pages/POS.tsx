
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CartItem, Client, Sale } from '../types';
import { Search, Plus, Minus, Trash, User, ShoppingCart, CheckCircle, Calendar, ArrowLeft, X, ShoppingBag as ShoppingBagIcon, Wallet, CreditCard, AlertCircle } from 'lucide-react';

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
  onSetSaleDate, onSetDiscount, onSetPaymentMethod, onSetAmountPaid, onCheckout, onCloseMobileCart
}) => {
  const balance = total - amountPaid;
  const isDebt = balance > 0;

  return (
    <>
      <div className="p-6 bg-coffee-900 text-white shadow-md flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onCloseMobileCart} className="md:hidden mr-2">
                <ArrowLeft />
            </button>
            <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart /> Orden</h2>
          </div>
          {selectedClient ? (
              <div className="flex items-center gap-2 bg-coffee-800 px-3 py-1 rounded-full text-sm border border-coffee-700">
                <User size={14} />
                <span className="truncate max-w-[100px] font-bold">{selectedClient.name}</span>
                <button onClick={() => onSetSelectedClient(null)} className="ml-2 hover:text-red-300">x</button>
              </div>
          ) : (
            <button onClick={onShowClientModal} className="text-xs bg-coffee-700 hover:bg-coffee-600 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap border border-coffee-600 font-bold">
              + Seleccionar Cliente
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <ShoppingBagIcon size={48} className="mx-auto mb-2 opacity-20" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0 mr-2">
                  <h4 className="font-bold text-gray-800 truncate text-sm">{item.name}</h4>
                  <p className="text-xs text-coffee-600 font-black">${item.appliedPrice}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"><Minus size={14} /></button>
                  <span className="font-black w-6 text-center text-gray-900 text-sm">{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"><Plus size={14} /></button>
                  <button onClick={() => onRemoveFromCart(item.id)} className="text-red-400 hover:text-red-600 ml-1 p-1"><Trash size={16} /></button>
                </div>
              </div>
            ))
          )}
      </div>

      <div className="p-4 md:p-6 bg-gray-50 border-t flex-shrink-0 space-y-4">
        {/* Payment Logic */}
        <div className="space-y-3">
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => onSetPaymentMethod('Efectivo')}
                 className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${paymentMethod === 'Efectivo' ? 'border-coffee-600 bg-coffee-50 text-coffee-800' : 'border-gray-200 bg-white text-gray-400'}`}
               >
                 <Wallet size={18} />
                 <span className="text-[10px] font-black uppercase">Efectivo</span>
               </button>
               <button 
                 onClick={() => onSetPaymentMethod('Transferencia')}
                 className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${paymentMethod === 'Transferencia' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-400'}`}
               >
                 <CreditCard size={18} />
                 <span className="text-[10px] font-black uppercase">Transfer</span>
               </button>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">Monto Abonado</span>
                    <div className="relative">
                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                        <input 
                           type="number"
                           className="w-24 pl-5 pr-2 py-1 border rounded-lg text-right font-black text-coffee-700 bg-gray-50 focus:bg-white transition-colors outline-none"
                           value={amountPaid === 0 ? '' : amountPaid}
                           placeholder={total.toString()}
                           onChange={(e) => onSetAmountPaid(e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                    </div>
                </div>
                {isDebt && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={12}/> Saldo Pendiente</span>
                        <span className="text-red-600 font-black">${balance.toLocaleString()}</span>
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-2 mb-2 border-t pt-2">
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Subtotal</span>
              <span>${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-medium items-center">
              <span>Descuento ($)</span>
              <input 
                type="number" 
                value={discount === 0 ? '' : discount} 
                onChange={e => onSetDiscount(Number(e.target.value))}
                className="w-20 text-right border rounded-lg px-2 py-0.5 bg-white text-gray-900"
                placeholder="0"
              />
            </div>
            <div className="flex justify-between text-xl font-black text-coffee-900">
              <span>TOTAL</span>
              <span>${total.toLocaleString()}</span>
            </div>
        </div>
        
        <button 
          disabled={cart.length === 0 || (isDebt && !selectedClient)}
          onClick={onCheckout}
          className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg flex flex-col justify-center items-center gap-1 transition-all active:scale-95 ${cart.length > 0 && !(isDebt && !selectedClient) ? 'bg-coffee-600 text-white hover:bg-coffee-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-2">
            {successMsg ? <CheckCircle /> : 'Finalizar Venta'}
          </div>
          {isDebt && !selectedClient && (
            <span className="text-[10px] uppercase tracking-tighter text-red-100">Seleccione cliente para fiado</span>
          )}
          {successMsg && <span className="text-xs">{successMsg}</span>}
        </button>
      </div>
    </>
  );
};

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

  // Sync amountPaid with total when cart changes, unless user touched it
  useEffect(() => {
    setAmountPaid(total);
  }, [total]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1, appliedPrice: product.sellingPrice }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (item.stock < newQty) {
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

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const balance = total - amountPaid;
    if (balance > 0 && !selectedClient) {
        alert("Debe seleccionar un cliente para registrar una deuda.");
        return;
    }

    const checkoutDate = new Date(saleDate);
    const now = new Date();
    checkoutDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    addSale({
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

    setSuccessMsg('Venta Realizada!');
    setCart([]);
    setSelectedClient(null);
    setDiscount(0);
    setAmountPaid(0);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setTimeout(() => {
        setSuccessMsg('');
        setIsMobileCartOpen(false);
    }, 2000);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredClients = useMemo(() => clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())), [clients, clientSearchTerm]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-100 overflow-hidden relative">
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <div className="mb-4 md:mb-6">
          <div className="relative">
             <Search className="absolute left-3 top-3 text-gray-400" size={20} />
             <input 
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-coffee-500 text-base md:text-lg bg-white text-gray-900" 
              placeholder="Buscar productos..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-24 md:pb-20">
          {filteredProducts.map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-row md:flex-col gap-4 md:gap-0 items-center md:items-stretch h-auto md:h-full border-2 border-transparent ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-coffee-300'}`}
            >
              <div className="w-16 h-16 md:w-full md:h-28 md:mb-3 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                <h3 className="font-bold text-gray-800 line-clamp-2 text-sm md:text-base">{product.name}</h3>
                <div className="mt-1 md:mt-auto pt-0 md:pt-2 flex flex-col md:flex-row md:justify-between md:items-center">
                  <span className="font-black text-lg text-coffee-600">${product.sellingPrice}</span>
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full w-fit mt-1 md:mt-0 ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.stock} disp
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:flex w-96 bg-white shadow-2xl flex-col border-l border-gray-200 z-10">
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

      {cart.length > 0 && (
         <div className="md:hidden fixed bottom-6 right-6 left-6 z-20">
            <button 
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full bg-coffee-600 text-white rounded-2xl py-4 px-6 shadow-2xl flex justify-between items-center animate-bounce-in"
            >
               <div className="flex items-center gap-2">
                 <div className="bg-white text-coffee-600 w-8 h-8 rounded-full flex items-center justify-center font-black">
                    {totalItems}
                 </div>
                 <span className="font-black">Ver Carrito</span>
               </div>
               <span className="font-black text-xl">${total.toLocaleString()}</span>
            </button>
         </div>
      )}

      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-30 flex flex-col animate-slide-up">
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

      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[85vh] flex flex-col shadow-2xl animate-scale-up">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-black text-xl text-coffee-900">Seleccionar Cliente</h3>
               <button onClick={() => {setShowClientModal(false); setClientSearchTerm('');}} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <div className="relative mb-4">
               <Search className="absolute left-3 top-3 text-gray-400" size={18} />
               <input 
                 autoFocus
                 type="text" 
                 placeholder="Buscar por nombre..." 
                 className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coffee-500 outline-none text-gray-900 font-bold"
                 value={clientSearchTerm}
                 onChange={(e) => setClientSearchTerm(e.target.value)}
               />
             </div>
             <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
               {filteredClients.map(c => (
                 <div 
                   key={c.id} 
                   onClick={() => { setSelectedClient(c); setShowClientModal(false); setClientSearchTerm(''); }}
                   className="p-4 hover:bg-coffee-50 cursor-pointer border-b last:border-0 rounded-xl transition-colors group"
                 >
                   <div className="flex justify-between items-center">
                     <div>
                       <p className="font-bold text-gray-900 group-hover:text-coffee-700">{c.name}</p>
                       <p className="text-[10px] text-gray-400 font-bold uppercase">{c.email || c.phone || 'Sin contacto'}</p>
                     </div>
                     <span className="text-xs font-black text-coffee-600 bg-coffee-50 px-3 py-1 rounded-full border border-coffee-100">
                       ${c.totalSpent.toLocaleString()}
                     </span>
                   </div>
                 </div>
               ))}
               {filteredClients.length === 0 && (
                 <div className="text-center py-10 text-gray-400">
                   <User size={32} className="mx-auto mb-2 opacity-20" />
                   <p className="text-sm">No se encontraron clientes.</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
