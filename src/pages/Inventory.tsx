import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { Plus, Search, Edit2, Trash2, ArrowDownCircle, Coffee, Upload, Image as ImageIcon, AlertTriangle, X, ZoomIn, ArrowUpDown, Package, DollarSign, TrendingUp, ChevronRight } from 'lucide-react';

const Inventory = () => {
  const { products, addProduct, updateProduct, deleteProduct, addPurchase, addConsumption } = useStore();
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

  const stockThreshold = Number(localStorage.getItem('coffeemaster_stock_threshold')) || 10;

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: 'Grano', costPrice: 0, marginPercentage: 30, sellingPrice: 0, stock: 0, description: '', imageUrl: ''
  });

  const [purchaseData, setPurchaseData] = useState({ quantity: 0, unitCost: 0, date: new Date().toISOString().split('T')[0] });
  const [consumptionData, setConsumptionData] = useState({ quantity: 1, date: new Date().toISOString().split('T')[0] });

  // Cálculos de valorización
  const inventoryTotals = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = Number(p.stock) || 0;
      acc.totalCost += (stock * (Number(p.costPrice) || 0));
      acc.totalMarket += (stock * (Number(p.sellingPrice) || 0));
      return acc;
    }, { totalCost: 0, totalMarket: 0 });
  }, [products]);

  const potentialProfit = inventoryTotals.totalMarket - inventoryTotals.totalCost;

  // Handlers
  const handleOpenModal = (product?: Product) => {
    if (product) { setFormData(product); setSelectedProduct(product); } 
    else { setFormData({ name: '', category: 'Grano', costPrice: 0, marginPercentage: 30, sellingPrice: 0, stock: 0, description: '', imageUrl: '' }); setSelectedProduct(null); }
    setIsModalOpen(true);
  };

  const handleOpenPurchase = (product: Product) => {
    setSelectedProduct(product);
    setPurchaseData({ quantity: 1, unitCost: product.costPrice, date: new Date().toISOString().split('T')[0] });
    setIsPurchaseModalOpen(true);
  };

  const calculatePrice = (cost: number, margin: number) => Math.round(cost * (1 + margin / 100));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 400; canvas.height = 400;
          ctx?.drawImage(img, 0, 0, 400, 400);
          setFormData(prev => ({ ...prev, imageUrl: canvas.toDataURL('image/jpeg', 0.7) }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
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
    <div className="space-y-8 animate-fade-in pb-24 md:pb-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-[#1C1C1C] tracking-tighter uppercase italic leading-none">Inventario</h2>
          <p className="text-[#6B7A3A] font-bold text-xs uppercase tracking-[0.2em] mt-2">Control de Stock y Valorización</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto bg-[#1C1C1C] text-[#E8DFC8] px-8 py-4 rounded-[1.5rem] font-black uppercase italic tracking-tighter flex items-center justify-center gap-2 shadow-xl hover:bg-[#6B7A3A] transition-all active:scale-95"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {/* RESUMEN DE VALORIZACIÓN (RESPONSIVO) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-400">
             <Package size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest">Valor al Costo</span>
          </div>
          <p className="text-3xl font-black text-[#1C1C1C]">${inventoryTotals.totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-50 shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-[#6B7A3A]">
             <DollarSign size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest">Valor Mercado</span>
          </div>
          <p className="text-3xl font-black text-[#1C1C1C]">${inventoryTotals.totalMarket.toLocaleString()}</p>
        </div>
        <div className="bg-[#6B7A3A] p-6 rounded-[2rem] text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2 opacity-70">
             <TrendingUp size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest">Utilidad Estimada</span>
          </div>
          <p className="text-3xl font-black">${potentialProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col lg:flex-row gap-4 bg-gray-50 p-4 rounded-[2rem] border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar variedad..." 
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-transparent rounded-2xl outline-none font-bold focus:border-[#6B7A3A] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`flex-1 lg:flex-none px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${showLowStockOnly ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}
          >
            Stock Bajo
          </button>
          <div className="flex-1 lg:flex-none relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl outline-none font-black text-[10px] uppercase tracking-widest appearance-none"
            >
              <option value="name">Nombre</option>
              <option value="stock_asc">Menor Stock</option>
              <option value="stock_desc">Mayor Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white rounded-[2.5rem] border-2 border-gray-50 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#6B7A3A]/20 transition-all group flex flex-col">
            <div className="h-56 relative overflow-hidden bg-gray-100">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button onClick={() => setPreviewImage(product.imageUrl)} className="p-4 bg-white rounded-full text-[#1C1C1C] scale-50 group-hover:scale-100 transition-transform"><ZoomIn size={24}/></button>
              </div>
              <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${product.stock <= stockThreshold ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-[#1C1C1C]'}`}>
                {product.stock} DISP.
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-4">
                <span className="text-[9px] font-black uppercase text-[#6B7A3A] tracking-[0.2em]">{product.category}</span>
                <h3 className="text-xl font-black text-[#1C1C1C] uppercase italic leading-none mt-1">{product.name}</h3>
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2">
                <button onClick={() => handleOpenPurchase(product)} className="col-span-2 py-3 bg-[#6B7A3A]/10 text-[#6B7A3A] rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#6B7A3A] hover:text-white transition-all"><ArrowDownCircle size={16}/> Cargar Compra</button>
                <button onClick={() => handleOpenModal(product)} className="py-3 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#1C1C1C] hover:text-white transition-all flex items-center justify-center gap-2"><Edit2 size={14}/> Editar</button>
                <button onClick={(e) => { e.stopPropagation(); setProductToDelete(product); setIsDeleteModalOpen(true); }} className="py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"><Trash2 size={14}/> Borrar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PRINCIPAL (RESPONSIVO) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1C1C1C]/90 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-slide-up border-t-8 border-[#6B7A3A]">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">{selectedProduct ? 'Editar Café' : 'Nuevo Café'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-full text-[#1C1C1C] transition-all"><X size={28} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-48 h-48 bg-gray-50 rounded-[2.5rem] overflow-hidden border-4 border-dashed border-gray-100 flex items-center justify-center relative group">
                    {formData.imageUrl ? <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-gray-200" />}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-[#6B7A3A]/80 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all font-black uppercase text-[10px] tracking-widest"><Upload size={24} className="mb-2" /> Subir Imagen</button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre de la Variedad</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-black text-[#1C1C1C] outline-none focus:border-[#6B7A3A] transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Categoría</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-black text-[#1C1C1C] outline-none focus:border-[#6B7A3A] transition-all appearance-none">
                      <option value="Grano">Café en Grano</option>
                      <option value="Molido">Café Molido</option>
                      <option value="Accesorios">Accesorios</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-6 rounded-[2.5rem]">
                <div>
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Costo ($)</label>
                  <input type="number" value={formData.costPrice || ''} onChange={e => handleCostOrMarginChange(Number(e.target.value), Number(formData.marginPercentage))} className="w-full p-4 bg-white rounded-2xl font-black text-xl outline-none border-2 border-transparent focus:border-[#6B7A3A]" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Margen (%)</label>
                  <input type="number" value={formData.marginPercentage || ''} onChange={e => handleCostOrMarginChange(Number(formData.costPrice), Number(e.target.value))} className="w-full p-4 bg-white rounded-2xl font-black text-xl outline-none border-2 border-transparent focus:border-[#6B7A3A]" placeholder="30" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Venta ($)</label>
                  <input type="number" value={formData.sellingPrice || ''} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value), marginPercentage: 0})} className="w-full p-4 bg-[#1C1C1C] text-[#E8DFC8] rounded-2xl font-black text-xl outline-none" placeholder="0" />
                </div>
              </div>

              <button type="submit" className="w-full py-6 bg-[#6B7A3A] text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all uppercase italic tracking-tighter">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPRA (REPOSICIÓN) */}
      {isPurchaseModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-[#1C1C1C]/90 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
           <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] w-full max-w-md p-8 animate-slide-up border-t-8 border-[#6B7A3A]">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter">Cargar Stock</h3>
                 <button onClick={() => setIsPurchaseModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={28}/></button>
              </div>
              <form onSubmit={handleSubmitPurchase} className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Cantidad de Unidades</label>
                   <input required type="number" min="1" autoFocus value={purchaseData.quantity || ''} onChange={e => setPurchaseData({...purchaseData, quantity: Number(e.target.value)})} className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl font-black text-2xl outline-none focus:border-[#6B7A3A]" placeholder="0" />
                 </div>
                 <div>
                   <label className="text-[10px] font-black uppercase text-[#6B7A3A] tracking-widest ml-1">Costo por Unidad ($)</label>
                   <input required type="number" value={purchaseData.unitCost || ''} onChange={e => setPurchaseData({...purchaseData, unitCost: Number(e.target.value)})} className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl font-black text-2xl outline-none focus:border-[#6B7A3A]" placeholder="0" />
                 </div>
                 <div className="p-4 bg-[#1C1C1C] rounded-2xl flex justify-between items-center border-b-4 border-[#6B7A3A]">
                    <span className="text-[10px] font-black uppercase text-[#E8DFC8]/60 tracking-widest">Total Inversión</span>
                    <span className="text-2xl font-black text-[#E8DFC8]">${(purchaseData.quantity * purchaseData.unitCost).toLocaleString()}</span>
                 </div>
                 <button type="submit" className="w-full py-6 bg-[#6B7A3A] text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all uppercase italic tracking-tighter">Finalizar Carga</button>
              </form>
           </div>
        </div>
      )}

      {/* CONFIRMACIÓN BORRAR */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center border-t-8 border-red-600">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
              <h3 className="text-xl font-black mb-2 uppercase italic tracking-tighter">¿Eliminar Producto?</h3>
              <p className="text-xs text-gray-500 font-bold mb-8">Esta acción borrará el historial de este café de forma permanente.</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => { deleteProduct(productToDelete!.id); setIsDeleteModalOpen(false); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]">Sí, Eliminar Todo</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* PREVIEW IMAGEN */}
      {previewImage && (
        <div className="fixed inset-0 bg-[#1C1C1C]/95 z-[300] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[80vh] rounded-[3rem] shadow-2xl border-4 border-white animate-scale-up" />
        </div>
      )}

    </div>
  );
};

export default Inventory;
