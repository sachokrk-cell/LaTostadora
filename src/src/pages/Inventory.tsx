
import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { Plus, Search, Edit2, Trash2, ArrowDownCircle, Coffee, Upload, Image as ImageIcon, AlertTriangle, X, ZoomIn, Filter, ArrowUpDown, Package, DollarSign, TrendingUp } from 'lucide-react';

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

  // Get threshold from localStorage (same logic as Dashboard)
  const stockThreshold = Number(localStorage.getItem('coffeemaster_stock_threshold')) || 10;

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Grano',
    costPrice: 0,
    marginPercentage: 30,
    sellingPrice: 0,
    stock: 0,
    description: '',
    imageUrl: ''
  });

  const [purchaseData, setPurchaseData] = useState({
    quantity: 0,
    unitCost: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [consumptionData, setConsumptionData] = useState({
    quantity: 1,
    date: new Date().toISOString().split('T')[0]
  });

  // Cálculos de valorización de stock
  const inventoryTotals = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = Number(p.stock) || 0;
      const cost = Number(p.costPrice) || 0;
      const sale = Number(p.sellingPrice) || 0;
      
      acc.totalCost += (stock * cost);
      acc.totalMarket += (stock * sale);
      acc.totalStock += stock;
      return acc;
    }, { totalCost: 0, totalMarket: 0, totalStock: 0 });
  }, [products]);

  const potentialProfit = inventoryTotals.totalMarket - inventoryTotals.totalCost;

  const handleOpenModal = (e?: React.MouseEvent, product?: Product) => {
    if(e) e.stopPropagation();
    if (product) {
      setFormData(product);
      setSelectedProduct(product);
    } else {
      setFormData({
        name: '',
        category: 'Grano',
        costPrice: 0,
        marginPercentage: 30,
        sellingPrice: 0,
        stock: 0,
        description: '',
        imageUrl: ''
      });
      setSelectedProduct(null);
    }
    setIsModalOpen(true);
  };

  const handleOpenPurchase = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setPurchaseData({ 
        quantity: 1, 
        unitCost: product.costPrice,
        date: new Date().toISOString().split('T')[0]
    });
    setIsPurchaseModalOpen(true);
  };

  const handleOpenConsumption = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setConsumptionData({
        quantity: 1,
        date: new Date().toISOString().split('T')[0]
    });
    setIsConsumptionModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
        deleteProduct(productToDelete.id);
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
    }
  };

  const calculatePrice = (cost: number, margin: number) => {
    return Math.round(cost * (1 + margin / 100));
  };

  const handleCostOrMarginChange = (cost: number, margin: number) => {
    setFormData(prev => ({
      ...prev,
      costPrice: cost,
      marginPercentage: margin,
      sellingPrice: calculatePrice(cost, margin)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, imageUrl: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const finalImage = formData.imageUrl || 'https://via.placeholder.com/200?text=No+Image';
    const productToSave: Product = {
      id: selectedProduct ? selectedProduct.id : crypto.randomUUID(),
      name: formData.name!,
      description: formData.description || '',
      category: formData.category || 'Otros',
      costPrice: Number(formData.costPrice),
      marginPercentage: Number(formData.marginPercentage),
      sellingPrice: Number(formData.sellingPrice),
      stock: Number(formData.stock),
      imageUrl: finalImage,
      history: selectedProduct ? selectedProduct.history : []
    };

    if (selectedProduct) {
      updateProduct(productToSave);
    } else {
      addProduct(productToSave);
    }
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
      alert("No hay suficiente stock para este consumo.");
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

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(p => !showLowStockOnly || p.stock <= stockThreshold)
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        if (sortBy === 'stock_desc') return b.stock - a.stock;
        return 0;
      });
  }, [products, searchTerm, showLowStockOnly, sortBy, stockThreshold]);

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-coffee-900">Inventario</h2>
        <button 
          onClick={(e) => handleOpenModal(e)}
          className="w-full md:w-auto bg-coffee-600 hover:bg-coffee-700 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {/* Resumen de Valorización */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none mb-1">Valor al Costo</p>
            <p className="text-xl font-black text-gray-800">${inventoryTotals.totalCost.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none mb-1">Valor de Mercado</p>
            <p className="text-xl font-black text-gray-800">${inventoryTotals.totalMarket.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-coffee-50 text-coffee-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider leading-none mb-1">Utilidad Potencial</p>
            <p className="text-xl font-black text-coffee-700">${potentialProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filter & Sort */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o categoría..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl w-full focus:ring-2 focus:ring-coffee-500 outline-none transition-all text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
               <button 
                onClick={() => setShowLowStockOnly(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!showLowStockOnly ? 'bg-white text-coffee-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 Todos
               </button>
               <button 
                onClick={() => setShowLowStockOnly(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${showLowStockOnly ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 {showLowStockOnly && <AlertTriangle size={12} />} Stock Bajo
               </button>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
              <ArrowUpDown size={16} className="text-gray-400" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
              >
                <option value="name">Nombre (A-Z)</option>
                <option value="stock_asc">Stock (Menor a Mayor)</option>
                <option value="stock_desc">Stock (Mayor a Menor)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100 flex flex-col group animate-fade-in">
              <div 
                className="h-48 overflow-hidden relative bg-gray-100 cursor-zoom-in"
                onClick={() => setPreviewImage(product.imageUrl)}
              >
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity scale-50 group-hover:scale-100 duration-300" size={32} />
                </div>
                <div className={`absolute top-2 right-2 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-black shadow-sm ${product.stock <= stockThreshold ? 'bg-red-500/90 text-white' : 'bg-white/90 text-coffee-800'}`}>
                  Stock: {product.stock}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 leading-tight">{product.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{product.category}</span>
                  </div>
                  <p className="font-bold text-xl text-coffee-600">${product.sellingPrice}</p>
                </div>
                
                <div className="mt-auto pt-4 flex gap-2 border-t border-gray-100">
                  <button 
                    onClick={(e) => handleOpenPurchase(e, product)}
                    className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg flex justify-center items-center text-sm font-bold transition-colors"
                  >
                    <ArrowDownCircle size={16} className="mr-1" /> Stock
                  </button>
                  <button 
                    onClick={(e) => handleOpenConsumption(e, product)}
                    className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    title="Consumo"
                  >
                    <Coffee size={18} />
                  </button>
                  <button 
                    onClick={(e) => handleOpenModal(e, product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteClick(e, product)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
           <Search size={48} className="mx-auto text-gray-200 mb-4" />
           <h3 className="text-xl font-bold text-gray-400">No se encontraron productos</h3>
           <p className="text-gray-400 text-sm">Prueba ajustando los filtros o el término de búsqueda.</p>
        </div>
      )}

      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X size={32} />
          </button>
          <div className="relative max-w-4xl w-full h-full flex items-center justify-center p-4 md:p-12 pointer-events-none">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scale-up pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-40 h-40 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center relative group">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-400 text-center p-4">
                        <ImageIcon className="mx-auto mb-2" />
                        <span className="text-xs">Sin imagen</span>
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Upload size={24} />
                    </button>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-coffee-600 font-bold hover:underline"
                  >
                    {formData.imageUrl ? 'Cambiar Foto' : 'Subir Foto'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-gray-900">
                      <option value="Grano">Café en Grano</option>
                      <option value="Molido">Café Molido</option>
                      <option value="Accesorios">Accesorios</option>
                      <option value="Comida">Pastelería/Comida</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                    <textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-gray-900" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Costo ($)</label>
                  <input type="number" min="0" value={formData.costPrice === 0 ? '' : formData.costPrice} onChange={e => handleCostOrMarginChange(Number(e.target.value), Number(formData.marginPercentage))} className="w-full border rounded-lg p-2 bg-white text-gray-900 border-gray-300" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Margen (%)</label>
                  <input type="number" min="0" value={formData.marginPercentage === 0 ? '' : formData.marginPercentage} onChange={e => handleCostOrMarginChange(Number(formData.costPrice), Number(e.target.value))} className="w-full border rounded-lg p-2 bg-white text-gray-900 border-gray-300" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Precio Venta ($)</label>
                  <input type="number" min="0" value={formData.sellingPrice === 0 ? '' : formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value), marginPercentage: 0})} className="w-full border rounded-lg p-2 font-bold text-coffee-700 bg-white border-gray-300" placeholder="0" />
                </div>
              </div>

              {!selectedProduct && (
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Stock Inicial</label>
                    <input type="number" min="0" value={formData.stock === 0 ? '' : formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white text-gray-900 border-gray-300" placeholder="0" />
                 </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-coffee-600 text-white rounded-lg hover:bg-coffee-700 font-bold shadow-md">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

       {isPurchaseModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Registrar Compra / Reposición</h3>
            <p className="text-gray-500 text-sm mb-4">Producto: <span className="font-bold text-gray-800">{selectedProduct.name}</span></p>
            <form onSubmit={handleSubmitPurchase} className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                  <input required type="date" value={purchaseData.date} onChange={e => setPurchaseData({...purchaseData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-gray-900 border-gray-300" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cantidad Comprada</label>
                  <input autoFocus required type="number" min="1" value={purchaseData.quantity === 0 ? '' : purchaseData.quantity} onChange={e => setPurchaseData({...purchaseData, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white text-gray-900 border-gray-300" placeholder="0" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Costo Unitario ($)</label>
                  <input required type="number" min="0" value={purchaseData.unitCost === 0 ? '' : purchaseData.unitCost} onChange={e => setPurchaseData({...purchaseData, unitCost: Number(e.target.value)})} className="w-full border rounded-lg p-2 bg-white text-gray-900 border-gray-300" placeholder="0" />
               </div>
               <div className="bg-gray-50 p-3 rounded text-sm flex justify-between">
                  <span>Total Compra:</span>
                  <span className="font-bold text-gray-900">${(purchaseData.quantity * purchaseData.unitCost).toLocaleString()}</span>
               </div>
               <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
       )}

       {isConsumptionModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gray-900"><Coffee className="text-amber-600"/> Consumo Propio</h3>
            <form onSubmit={handleSubmitConsumption} className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label>
                  <input required type="date" value={consumptionData.date} onChange={e => setConsumptionData({...consumptionData, date: e.target.value})} className="w-full border rounded-lg p-2 bg-white text-gray-900 border-gray-300" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Cantidad a retirar</label>
                  <input autoFocus required type="number" min="1" max={selectedProduct.stock} value={consumptionData.quantity === 0 ? '' : consumptionData.quantity} onChange={e => setConsumptionData({...consumptionData, quantity: Number(e.target.value)})} className="w-full border rounded-lg p-2 text-center text-2xl font-bold text-gray-800 bg-white border-gray-300" placeholder="1" />
               </div>
               <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsConsumptionModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-bold shadow-md">Registrar</button>
              </div>
            </form>
          </div>
        </div>
       )}

       {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 animate-scale-up">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertTriangle size={32} /></div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Producto?</h3>
                 <p className="text-gray-600 text-sm mb-6">Estás a punto de eliminar <span className="font-bold">{productToDelete.name}</span>. Esta acción no se puede deshacer.</p>
                 <div className="flex gap-3 justify-center">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Cancelar</button>
                    <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md">Sí, Eliminar</button>
                 </div>
              </div>
           </div>
        </div>
       )}
    </div>
  );
};

export default Inventory;
