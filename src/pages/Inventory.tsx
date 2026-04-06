import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { 
  Plus, Search, Edit2, Trash2, ArrowDownCircle, Coffee, 
  Upload, Image as ImageIcon, AlertTriangle, X, 
  ArrowLeft 
} from 'lucide-react';

const Inventory = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    addPurchase, 
    addConsumption, 
    stockThreshold 
  } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc'>('name');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: 'Grano', costPrice: 0, marginPercentage: 30, sellingPrice: 0, stock: 0, description: '', imageUrl: ''
  });
  const [purchaseData, setPurchaseData] = useState({ quantity: 0, unitCost: 0, date: new Date().toISOString().split('T')[0] });
  const [consumptionData, setConsumptionData] = useState({ quantity: 1, date: new Date().toISOString().split('T')[0] });

  // --- MEJORA: AUTO-CALCULO DE PRECIO DE VENTA ---
  useEffect(() => {
    if (isModalOpen) {
      const cost = Number(formData.costPrice) || 0;
      const margin = Number(formData.marginPercentage) || 0;
      const calculatedPrice = Math.round(cost * (1 + margin / 100));
      if (calculatedPrice !== formData.sellingPrice) {
        setFormData(prev => ({ ...prev, sellingPrice: calculatedPrice }));
      }
    }
  }, [formData.costPrice, formData.marginPercentage]);

  const inventoryTotals = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = Number(p.stock) || 0;
      acc.totalCost += (stock * (Number(p.costPrice) || 0));
      acc.totalMarket += (stock * (Number(p.sellingPrice) || 0));
      return acc;
    }, { totalCost: 0, totalMarket: 0 });
  }, [products]);

  const potentialProfit = inventoryTotals.totalMarket - inventoryTotals.totalCost;

  const handleOpenModal = (e?: React.MouseEvent, product?: Product) => {
    if (e) e.stopPropagation();
    if (product) {
      setFormData(product);
      setSelectedProduct(product);
    } else {
      setFormData({ name: '', category: 'Grano', costPrice: 0, marginPercentage: 30, sellingPrice: 0, stock: 0, description: '', imageUrl: '' });
      setSelectedProduct(null);
    }
    setIsModalOpen(true);
  };

  const handleOpenPurchase = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setPurchaseData({ quantity: 1, unitCost: product.costPrice, date: new Date().toISOString().split('T')[0] });
    setIsPurchaseModalOpen(true);
  };

  const handleOpenConsumption = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setConsumptionData({ quantity: 1, date: new Date().toISOString().split('T')[0] });
    setIsConsumptionModalOpen(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const productToSave: Product = {
      id: selectedProduct ? selectedProduct.id : crypto.randomUUID(),
      name: formData.name!,
      description: formData.description || '',
      category: formData.category || 'Otros',
      costPrice: Number(formData.costPrice),
      marginPercentage: Number(formData.marginPercentage),
      sellingPrice: Number(formData.sellingPrice),
      stock: Number(formData.stock),
      imageUrl: formData.imageUrl || 'https://via.placeholder.com/200?text=No+Image',
      history: selectedProduct ? selectedProduct.history : []
    };
    if (selectedProduct) await updateProduct(productToSave);
    else await addProduct(productToSave);
    setIsModalOpen(false);
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase())))
      .filter(p => !showLowStockOnly || p.stock <= stockThreshold)
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        return b.stock - a.stock;
      });
  }, [products, searchTerm, showLowStockOnly, sortBy, stockThreshold]);

  return (
    <div className="p-2 md:p-8 space-y-6 pb-24 text-[#1C1C1C] bg-white min-h-screen">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Inventario</h2>
        <button onClick={(e) => handleOpenModal(e)} className="w-full md:w-auto bg-[#1C1C1C] text-[#E8DFC8] px-8 py-5 rounded-[2rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {/* KPIS DE VALORIZACIÓN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2">
        <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-gray-100 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Costo Total</p>
          <p className="text-2xl font-black">${inventoryTotals.totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-gray-100 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest mb-1">Valor Venta</p>
          <p className="text-2xl font-black">${inventoryTotals.totalMarket.toLocaleString()}</p>
        </div>
        <div className="bg-[#6B7A3A] p-6 rounded-[2.5rem] text-white shadow-lg">
          <p className="text-[10px] font-black uppercase text-white/60 tracking-widest mb-1">Utilidad Esperada</p>
          <p className="text-2xl font-black">${potentialProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="bg-white p-2 rounded-[2rem] flex flex-col lg:flex-row gap-2 border-2 border-gray-50">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar variedad..." className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] outline-none font-bold focus:border-[#6B7A3A] transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLowStockOnly(!showLowStockOnly)} className={`flex-1 lg:flex-none px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border-2 transition-all ${showLowStockOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>Stock Bajo</button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="flex-1 lg:flex-none px-4 py-4 bg-white border-2 border-gray-100 rounded-[1.5rem] font-black text-[10px] uppercase outline-none">
            <option value="name">Nombre</option>
            <option value="stock_asc">Menor Stock</option>
            <option value="stock_desc">Mayor Stock</option>
          </select>
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-[3rem] border-2 border-gray-50 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="h-52 relative overflow-hidden bg-gray-50 cursor-zoom-in" onClick={() => setPreviewImage(product.imageUrl)}>
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl ${product.stock <= stockThreshold ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-[#1C1C1C]'}`}>
                {product.stock} DISP.
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-6">
                <span className="text-[9px] font-black uppercase text-[#6B7A3A] tracking-[0.2em]">{product.category}</span>
                <h3 className="text-xl font-black uppercase italic leading-none mt-1 truncate">{product.name}</h3>
              </div>
              
              <div className="mt-auto space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={(e) => handleOpenPurchase(e, product)} className="py-4 bg-[#6B7A3A]/10 text-[#6B7A3A] rounded-2xl font-black text-[9px] uppercase flex flex-col items-center justify-center gap-1 hover:bg-[#6B7A3A] hover:text-white transition-all">
                    <ArrowDownCircle size={18}/> Compra
                  </button>
                  <button onClick={(e) => handleOpenConsumption(e, product)} className="py-4 bg-amber-50 text-amber-700 rounded-2xl font-black text-[9px] uppercase flex flex-col items-center justify-center gap-1 hover:bg-amber-100 transition-all">
                    <Coffee size={18}/> Consumo
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={(e) => handleOpenModal(e, product)} className="py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[9px] uppercase flex flex-col items-center justify-center gap-1 hover:bg-[#1C1C1C] hover:text-white transition-all">
                    <Edit2 size={16}/> Editar
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setProductToDelete(product); setIsDeleteModalOpen(true); }} className="py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[9px] uppercase flex flex-col items-center justify-center gap-1 hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 size={16}/> Borrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: NUEVO / EDITAR PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1C1C1C] z-[200] flex flex-col animate-slide-up sm:bg-[#1C1C1C]/90 sm:p-4 sm:items-center sm:justify-center">
          <div className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[3rem] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex items-center gap-4 bg-white sticky top-0 z-20">
              <button onClick={() => setIsModalOpen(false)} className="p-2 -ml-2 text-[#1C1C1C] hover:bg-gray-100 rounded-full transition-all">
                <ArrowLeft size={28} />
              </button>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{selectedProduct ? 'Editar Café' : 'Nuevo Café'}</h3>
            </div>
            
            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
               <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-48 h-48 bg-gray-50 rounded-[3rem] overflow-hidden border-4 border-dashed border-gray-100 flex items-center justify-center relative group">
                        {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-gray-200" />}
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                           <Upload size={32} />
                           <span className="text-[10px] font-black uppercase mt-2">Subir</span>
                        </button>
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setFormData({...formData, imageUrl: ev.target?.result as string});
                          reader.readAsDataURL(file);
                        }
                     }} />
                  </div>
                  <div className="flex-1 space-y-5">
                     <div>
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre</label>
                       <input required type="text" placeholder="Ej: Catuaí Vermelho" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-[#6B7A3A] transition-all" />
                     </div>
                     <div>
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Categoría</label>
                       <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-[#6B7A3A] transition-all">
                          <option value="Grano">Café en Grano</option>
                          <option value="Molido">Café Molido</option>
                          <option value="Accesorios">Accesorios</option>
                          <option value="Otros">Otros</option>
                       </select>
                     </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Costo ($)</label>
                    <input type="number" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} className="w-full p-5 bg-gray-50 rounded-2xl font-black text-center text-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Margen (%)</label>
                    <input type="number" value={formData.marginPercentage || ''} onChange={e => setFormData({...formData, marginPercentage: Number(e.target.value)})} className="w-full p-5 bg-gray-50 rounded-2xl font-black text-center text-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Venta ($)</label>
                    <input type="number" value={formData.sellingPrice || ''} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} className="w-full p-5 bg-[#1C1C1C] text-[#E8DFC8] rounded-2xl font-black text-center text-xl" />
                  </div>
               </div>
               
               {!selectedProduct && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Stock Inicial</label>
                    <input type="number" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full p-5 bg-gray-50 rounded-2xl font-black text-center text-xl" />
                  </div>
               )}
               
               <button type="submit" className="w-full py-6 bg-[#6B7A3A] text-white rounded-[2rem] font-black text-xl uppercase italic shadow-2xl active:scale-95 transition-all">Guardar Producto</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPRA / REPOSICIÓN */}
      {isPurchaseModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-[#1C1C1C] z-[200] flex flex-col animate-slide-up sm:bg-[#1C1C1C]/90 sm:p-4 sm:items-center sm:justify-center">
           <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-[3rem] flex flex-col overflow-hidden">
              <div className="p-6 border-b flex items-center gap-4 bg-white sticky top-0 z-20">
                <button onClick={() => setIsPurchaseModalOpen(false)} className="p-2 -ml-2 text-[#1C1C1C] hover:bg-gray-100 rounded-full transition-all">
                  <ArrowLeft size={28} />
                </button>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Cargar Compra</h3>
              </div>
              <div className="p-8 space-y-6">
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Producto: <span className="text-[#1C1C1C]">{selectedProduct.name}</span></p>
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    await addPurchase({
                      id: crypto.randomUUID(),
                      date: new Date(purchaseData.date).toISOString(),
                      productId: selectedProduct.id,
                      productName: selectedProduct.name,
                      quantity: Number(purchaseData.quantity),
                      unitCost: Number(purchaseData.unitCost),
                      totalCost: Number(purchaseData.quantity) * Number(purchaseData.unitCost)
                    });
                    setIsPurchaseModalOpen(false);
                 }} className="space-y-6">
                    <input required type="date" value={purchaseData.date} onChange={e => setPurchaseData({...purchaseData, date: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl font-black" />
                    <input required type="number" placeholder="Cantidad" value={purchaseData.quantity || ''} onChange={e => setPurchaseData({...purchaseData, quantity: Number(e.target.value)})} className="w-full p-5 bg-gray-50 rounded-2xl font-black text-3xl text-center" />
                    <input required type="number" placeholder="Costo Unitario" value={purchaseData.unitCost || ''} onChange={e => setPurchaseData({...purchaseData, unitCost: Number(e.target.value)})} className="w-full p-5 bg-gray-50 rounded-2xl font-black text-3xl text-center" />
                    <div className="p-5 bg-[#1C1C1C] rounded-[1.5rem] flex justify-between items-center border-b-8 border-[#6B7A3A]">
                       <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Inversión Total</span>
                       <span className="text-2xl font-black text-white">${(purchaseData.quantity * purchaseData.unitCost).toLocaleString()}</span>
                    </div>
                    <button type="submit" className="w-full py-6 bg-[#6B7A3A] text-white rounded-[2rem] font-black uppercase italic shadow-xl">Finalizar Carga</button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: CONSUMO PROPIO */}
      {isConsumptionModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-[#1C1C1C] z-[200] flex flex-col animate-slide-up sm:bg-[#1C1C1C]/90 sm:p-4 sm:items-center sm:justify-center">
           <div className="bg-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-[3rem] flex flex-col overflow-hidden">
              <div className="p-6 border-b flex items-center gap-4 bg-white sticky top-0 z-20">
                <button onClick={() => setIsConsumptionModalOpen(false)} className="p-2 -ml-2 text-[#1C1C1C] hover:bg-gray-100 rounded-full transition-all">
                  <ArrowLeft size={28} />
                </button>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Registrar Consumo</h3>
              </div>
              <div className="p-8 space-y-6 text-center">
                 <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-100 shadow-inner">
                    <Coffee size={40} />
                 </div>
                 <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Producto a retirar:</p>
                 <p className="text-2xl font-black uppercase italic tracking-tighter text-[#1C1C1C]">{selectedProduct.name}</p>
                 
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (consumptionData.quantity > selectedProduct.stock) { alert("Stock insuficiente."); return; }
                    
                    // CORRECCIÓN: Usar nombres de campos consistentes con la DB
                    await addConsumption({
                      id: crypto.randomUUID(),
                      date: new Date(consumptionData.date).toISOString(),
                      productId: selectedProduct.id, 
                      productName: selectedProduct.name,
                      quantity: Number(consumptionData.quantity),
                      reason: "Consumo Propio / Interno"
                    });
                    setIsConsumptionModalOpen(false);
                 }} className="space-y-6">
                    <input required type="date" value={consumptionData.date} onChange={e => setConsumptionData({...consumptionData, date: e.target.value})} className="w-full p-5 bg-gray-50 rounded-2xl font-black text-center" />
                    <input required type="number" max={selectedProduct.stock} placeholder="Cantidad" value={consumptionData.quantity || ''} onChange={e => setConsumptionData({...consumptionData, quantity: Number(e.target.value)})} className="w-full p-5 bg-amber-50 text-amber-700 border-4 border-amber-100 rounded-[2rem] font-black text-4xl text-center outline-none" />
                    <button type="submit" className="w-full py-6 bg-amber-600 text-white rounded-[2rem] font-black uppercase italic shadow-xl">Confirmar Consumo</button>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: ELIMINAR PRODUCTO */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
           <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full text-center border-t-8 border-red-600 shadow-2xl">
              <AlertTriangle className="mx-auto text-red-600 mb-4" size={56}/>
              <h3 className="text-xl font-black uppercase mb-2">¿Eliminar {productToDelete.name}?</h3>
              <p className="text-xs font-bold text-gray-500 mb-8 leading-relaxed">Se perderán todos los registros de compras y ventas históricos de esta variedad.</p>
              <div className="flex flex-col gap-3">
                <button onClick={async () => { await deleteProduct(productToDelete.id); setIsDeleteModalOpen(false); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">Sí, Eliminar de Todo</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-5 bg-gray-100 text-gray-900 rounded-2xl font-black uppercase">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* PREVIEW DE IMAGEN */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/95 z-[400] flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-[85vh] rounded-[3rem] border-4 border-white shadow-2xl animate-scale-up" />
          <button className="absolute top-8 right-8 text-white p-2 hover:bg-white/10 rounded-full"><X size={40}/></button>
        </div>
      )}

    </div>
  );
};

export default Inventory;
