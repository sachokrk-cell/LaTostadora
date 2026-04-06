import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { Plus, Search, Edit2, Trash2, ArrowDownCircle, Coffee, Upload, Image as ImageIcon, AlertTriangle, X, ZoomIn, ArrowUpDown, Package, DollarSign, TrendingUp } from 'lucide-react';

const Inventory = () => {
  const { products, addProduct, updateProduct, deleteProduct, addPurchase, addConsumption } = useStore();
  
  // ESTADOS DE FILTRO Y BÚSQUEDA
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc'>('name');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // ESTADOS DE MODALES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // PRODUCTOS SELECCIONADOS
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stockThreshold = Number(localStorage.getItem('coffeemaster_stock_threshold')) || 10;

  // ESTADOS DE FORMULARIOS
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: 'Grano', costPrice: 0, marginPercentage: 30, sellingPrice: 0, stock: 0, description: '', imageUrl: ''
  });
  const [purchaseData, setPurchaseData] = useState({ quantity: 0, unitCost: 0, date: new Date().toISOString().split('T')[0] });
  const [consumptionData, setConsumptionData] = useState({ quantity: 1, date: new Date().toISOString().split('T')[0] });

  // VALORIZACIÓN DE INVENTARIO
  const inventoryTotals = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = Number(p.stock) || 0;
      acc.totalCost += (stock * (Number(p.costPrice) || 0));
      acc.totalMarket += (stock * (Number(p.sellingPrice) || 0));
      return acc;
    }, { totalCost: 0, totalMarket: 0 });
  }, [products]);

  const potentialProfit = inventoryTotals.totalMarket - inventoryTotals.totalCost;

  // HANDLERS DE APERTURA DE MODALES (CON DETENCIÓN DE PROPAGACIÓN PARA EVITAR ERRORES)
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

  const handleDeleteClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // SUBMITS
  const handleSubmitProduct = (e: React.FormEvent) => {
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
    if (selectedProduct) updateProduct(productToSave);
    else addProduct(productToSave);
    setIsModalOpen(false);
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    addPurchase({
      id: crypto.randomUUID(),
      date: new Date(purchaseData.date).toISOString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: Number(purchaseData.quantity),
      unitCost: Number(purchaseData.unitCost),
      totalCost: Number(purchaseData.quantity) * Number(purchaseData.unitCost)
    });
    setIsPurchaseModalOpen(false);
  };

  const handleSubmitConsumption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (consumptionData.quantity > selectedProduct.stock) {
      alert("No hay suficiente stock.");
      return;
    }
    addConsumption({
      id: crypto.randomUUID(),
      date: new Date(consumptionData.date).toISOString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: Number(consumptionData.quantity),
      reason: "Consumo Propio / Interno"
    });
    setIsConsumptionModalOpen(false);
  };

  // LÓGICA DE FILTRADO
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
    <div className="p-2 md:p-8 space-y-6 pb-24 text-[#1C1C1C]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Inventario</h2>
        <button onClick={(e) => handleOpenModal(e)} className="w-full md:w-auto bg-[#1C1C1C] text-[#E8DFC8] px-8 py-4 rounded-[1.5rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 shadow-xl hover:bg-[#6B7A3A] transition-all">
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-2xl"><Package size={24}/></div>
          <div><p className="text-[10px] font-black uppercase text-gray-400">Valor al Costo</p><p className="text-2xl font-black">${inventoryTotals.totalCost.toLocaleString()}</p></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 flex items-center gap-4">
          <div className="p-3 bg-[#6B7A3A]/10 text-[#6B7A3A] rounded-2xl"><DollarSign size={24}/></div>
          <div><p className="text-[10px] font-black uppercase text-gray-400">Valor Mercado</p><p className="text-2xl font-black">${inventoryTotals.totalMarket.toLocaleString()}</p></div>
        </div>
        <div className="bg-[#6B7A3A] p-6 rounded-[2rem] text-white flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl"><TrendingUp size={24}/></div>
          <div><p className="text-[10px] font-black uppercase text-white/60">Utilidad Potencial</p><p className="text-2xl font-black">${potentialProfit.toLocaleString()}</p></div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-gray-50 p-4 rounded-[2rem] flex flex-col lg:flex-row gap-4 border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar variedad..." className="w-full pl-12 pr-4 py-3 bg-white border-2 border-transparent rounded-2xl outline-none font-bold focus:border-[#6B7A3A]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLowStockOnly(!showLowStockOnly)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${showLowStockOnly ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>Stock Bajo</button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl font-black text-[10px] uppercase outline-none">
            <option value="name">Nombre</option>
            <option value="stock_asc">Menor Stock</option>
            <option value="stock_desc">Mayor Stock</option>
          </select>
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-[2.5rem] border-2 border-gray-50 overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="h-48 relative overflow-hidden bg-gray-100 cursor-zoom-in" onClick={() => setPreviewImage(product.imageUrl)}>
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${product.stock <= stockThreshold ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-[#1C1C1C]'}`}>
                STOCK: {product.stock}
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-4">
                <span className="text-[9px] font-black uppercase text-[#6B7A3A] tracking-[0.2em]">{product.category}</span>
                <h3 className="text-xl font-black uppercase italic leading-none mt-1">{product.name}</h3>
              </div>
              
              {/* ACCIONES DEL PRODUCTO */}
              <div className="mt-auto space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={(e) => handleOpenPurchase(e, product)} className="py-3 bg-green-50 text-green-700 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-green-100 transition-colors">
                    <ArrowDownCircle size={14}/> Compra
                  </button>
                  <button onClick={(e) => handleOpenConsumption(e, product)} className="py-3 bg-amber-50 text-amber-700 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-amber-100 transition-colors">
                    <Coffee size={14}/> Consumo
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={(e) => handleOpenModal(e, product)} className="py-3 bg-blue-50 text-blue-700 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-blue-100 transition-colors">
                    <Edit2 size={14}/> Editar
                  </button>
                  <button onClick={(e) => handleDeleteClick(e, product)} className="py-3 bg-red-50 text-red-700 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-red-100 transition-colors">
                    <Trash2 size={14}/> Borrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PRODUCTO (EDICIÓN / NUEVO) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black uppercase italic">{selectedProduct ? 'Editar Café' : 'Nuevo Café'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmitProduct} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center gap-4">
                     <div className="w-40 h-40 bg-gray-50 rounded-[2rem] overflow-hidden border-4 border-dashed border-gray-200 flex items-center justify-center relative group">
                        {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon size={40} className="text-gray-200" />}
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center"><Upload/></button>
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
                  <div className="space-y-4">
                     <input required type="text" placeholder="Nombre Variedad" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-[#6B7A3A]" />
                     <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-[#6B7A3A]">
                        <option value="Grano">Café en Grano</option>
                        <option value="Molido">Café Molido</option>
                        <option value="Accesorios">Accesorios</option>
                        <option value="Otros">Otros</option>
                     </select>
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                  <input type="number" placeholder="Costo" value={formData.costPrice || ''} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-center" />
                  <input type="number" placeholder="Margen %" value={formData.marginPercentage || ''} onChange={e => setFormData({...formData, marginPercentage: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-center" />
                  <input type="number" placeholder="Venta" value={formData.sellingPrice || ''} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} className="w-full p-4 bg-[#1C1C1C] text-[#E8DFC8] rounded-2xl font-black text-center" />
               </div>
               {!selectedProduct && (
                  <input type="number" placeholder="Stock Inicial" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-center" />
               )}
               <button type="submit" className="w-full py-5 bg-[#6B7A3A] text-white rounded-[2rem] font-black text-lg uppercase italic shadow-xl">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPRA */}
      {isPurchaseModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
           <div className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-md p-8 animate-slide-up">
              <h3 className="text-xl font-black uppercase italic mb-6">Cargar Compra: {selectedProduct.name}</h3>
              <form onSubmit={handleSubmitPurchase} className="space-y-4">
                 <input required type="date" value={purchaseData.date} onChange={e => setPurchaseData({...purchaseData, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-black" />
                 <input required type="number" placeholder="Cantidad" value={purchaseData.quantity || ''} onChange={e => setPurchaseData({...purchaseData, quantity: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-2xl text-center" />
                 <input required type="number" placeholder="Costo Unitario" value={purchaseData.unitCost || ''} onChange={e => setPurchaseData({...purchaseData, unitCost: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-2xl text-center" />
                 <button type="submit" className="w-full py-5 bg-[#6B7A3A] text-white rounded-[2rem] font-black uppercase italic shadow-xl">Confirmar Carga</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL CONSUMO */}
      {isConsumptionModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
           <div className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-md p-8 animate-slide-up">
              <h3 className="text-xl font-black uppercase italic mb-6">Registrar Consumo: {selectedProduct.name}</h3>
              <form onSubmit={handleSubmitConsumption} className="space-y-4">
                 <input required type="date" value={consumptionData.date} onChange={e => setConsumptionData({...consumptionData, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl font-black" />
                 <input required type="number" max={selectedProduct.stock} placeholder="Cantidad a retirar" value={consumptionData.quantity || ''} onChange={e => setConsumptionData({...consumptionData, quantity: Number(e.target.value)})} className="w-full p-4 bg-amber-50 text-amber-900 border-2 border-amber-200 rounded-2xl font-black text-2xl text-center" />
                 <button type="submit" className="w-full py-5 bg-amber-600 text-white rounded-[2rem] font-black uppercase italic shadow-xl">Registrar Consumo</button>
              </form>
           </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center border-t-8 border-red-600">
              <AlertTriangle className="mx-auto text-red-600 mb-4" size={48}/>
              <h3 className="text-xl font-black uppercase mb-2">¿Eliminar {productToDelete.name}?</h3>
              <p className="text-xs font-bold text-gray-500 mb-6">Esta acción borrará todo el historial del producto.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { deleteProduct(productToDelete.id); setIsDeleteModalOpen(false); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase">Sí, Eliminar</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 bg-gray-100 rounded-2xl font-black uppercase">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* PREVIEW DE IMAGEN */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-[80vh] rounded-[2rem] border-4 border-white shadow-2xl" />
        </div>
      )}

    </div>
  );
};

export default Inventory;
