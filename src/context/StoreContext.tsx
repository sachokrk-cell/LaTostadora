import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Product, Client, Sale, Purchase, Consumption, PaymentRecord } from '../types';
import { supabase } from '../services/supabaseClient';

interface StoreContextType extends AppState {
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addSale: (sale: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addPaymentToSale: (saleId: string, payment: PaymentRecord) => Promise<void>;
  addPurchase: (purchase: Purchase) => Promise<void>;
  updatePurchase: (purchase: Purchase) => Promise<void>; // Nueva función
  deletePurchase: (id: string) => Promise<void>;
  addConsumption: (consumption: Consumption) => Promise<void>;
  resetData: () => void;
  exportData: () => void;
  importData: (jsonData: string) => Promise<void>;
  isSaveLocked: boolean;
  toggleSaveLock: () => void;
  dataSize: string;
  isLoading: boolean;
  syncStatus: 'connected' | 'syncing' | 'error' | 'none';
  pushToCloud: () => Promise<void>;
  pullFromCloud: () => Promise<void>;
  setSyncId: (id: string | undefined) => Promise<boolean>;
  createSyncSession: () => Promise<string>;
  isSyncing: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('coffeemaster_data');
    return saved ? JSON.parse(saved) : {
      products: [],
      clients: [],
      sales: [],
      purchases: [],
      consumptions: []
    };
  });

  const [isSaveLocked, setIsSaveLocked] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'error' | 'none'>(state.syncId ? 'connected' : 'none');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSaveLocked) {
      localStorage.setItem('coffeemaster_data', JSON.stringify(state));
    }
  }, [state, isSaveLocked]);

  const syncEverythingToCloud = async (currentState: AppState) => {
    if (!currentState.syncId) return;
    try {
      const { error } = await supabase
        .from('coffee_sync')
        .upsert({ 
          id: currentState.syncId, 
          data: currentState,
          updated_at: new Date().toISOString() 
        });
      if (error) throw error;
    } catch (e) {
      console.error("Error sincronizando:", e);
    }
  };

  const pullFromCloud = async () => {
    if (!state.syncId) return;
    setSyncStatus('syncing');
    try {
      const { data, error } = await supabase
        .from('coffee_sync')
        .select('data')
        .eq('id', state.syncId)
        .single();
      
      if (error) throw error;
      if (data) {
        setState(data.data);
      }
      setSyncStatus('connected');
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const addProduct = async (p: Product) => {
    const newState = { ...state, products: [...state.products, p] };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const updateProduct = async (p: Product) => {
    const newState = { ...state, products: state.products.map(old => old.id === p.id ? p : old) };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const deleteProduct = async (id: string) => {
    const newState = { ...state, products: state.products.filter(p => p.id !== id) };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const addClient = async (c: Client) => {
    const newState = { ...state, clients: [...state.clients, c] };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const updateClient = async (c: Client) => {
    const newState = { ...state, clients: state.clients.map(old => old.id === c.id ? c : old) };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const deleteClient = async (id: string) => {
    const newState = { ...state, clients: state.clients.filter(c => c.id !== id) };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const addSale = async (s: Sale) => {
    const updatedProducts = state.products.map(p => {
      const itemInCart = s.items.find(item => item.id === p.id);
      if (itemInCart) {
        return { ...p, stock: p.stock - itemInCart.quantity };
      }
      return p;
    });

    const updatedClients = state.clients.map(c => {
      if (c.id === s.clientId) {
        return { ...c, totalSpent: c.totalSpent + s.total };
      }
      return c;
    });

    const newState = { 
      ...state, 
      sales: [...state.sales, s],
      products: updatedProducts,
      clients: updatedClients
    };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const deleteSale = async (id: string) => {
    const newState = { ...state, sales: state.sales.filter(s => s.id !== id) };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const addPaymentToSale = async (saleId: string, payment: PaymentRecord) => {
    const newState = {
      ...state,
      sales: state.sales.map(s => {
        if (s.id === saleId) {
          return {
            ...s,
            amountPaid: s.amountPaid + payment.amount,
            balance: s.balance - payment.amount,
            payments: [...(s.payments || []), payment]
          };
        }
        return s;
      })
    };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const addPurchase = async (p: Purchase) => {
    const updatedProducts = state.products.map(prod => {
      if (prod.id === p.productId) {
        return { 
          ...prod, 
          stock: Number(prod.stock) + Number(p.quantity),
          costPrice: p.unitCost,
          sellingPrice: prod.marginPercentage > 0 ? Math.round(p.unitCost * (1 + prod.marginPercentage / 100)) : prod.sellingPrice
        };
      }
      return prod;
    });

    const newState = { ...state, purchases: [...state.purchases, p], products: updatedProducts };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  // --- NUEVA FUNCIÓN: EDITAR COMPRA Y AJUSTAR STOCK ---
  const updatePurchase = async (updatedPurchase: Purchase) => {
    const oldPurchase = state.purchases.find(p => p.id === updatedPurchase.id);
    if (!oldPurchase) return;

    // Calculamos la diferencia de stock (lo nuevo menos lo viejo)
    const stockDiff = Number(updatedPurchase.quantity) - Number(oldPurchase.quantity);

    const updatedProducts = state.products.map(p => {
      if (p.id === updatedPurchase.productId) {
        return {
          ...p,
          stock: Number(p.stock) + stockDiff, // Sumamos la diferencia (puede ser negativa si se bajó la cantidad)
          costPrice: updatedPurchase.unitCost,
          sellingPrice: p.marginPercentage > 0 ? Math.round(updatedPurchase.unitCost * (1 + p.marginPercentage / 100)) : p.sellingPrice
        };
      }
      return p;
    });

    const newState = {
      ...state,
      purchases: state.purchases.map(p => p.id === updatedPurchase.id ? updatedPurchase : p),
      products: updatedProducts
    };

    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const deletePurchase = async (id: string) => {
    const purchaseToDelete = state.purchases.find(p => p.id === id);
    if (!purchaseToDelete) return;

    const updatedProducts = state.products.map(prod => {
      if (prod.id === purchaseToDelete.productId) {
        return { 
          ...prod, 
          stock: Math.max(0, Number(prod.stock) - Number(purchaseToDelete.quantity)) 
        };
      }
      return prod;
    });

    const newState = { 
      ...state, 
      purchases: state.purchases.filter(p => p.id !== id),
      products: updatedProducts 
    };
    
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const addConsumption = async (c: Consumption) => {
    const updatedProducts = state.products.map(p => {
      if (p.id === c.productId) {
        return { ...p, stock: Math.max(0, p.stock - c.quantity) };
      }
      return p;
    });

    const newState = { ...state, products: updatedProducts, consumptions: [...state.consumptions, c] };
    setState(newState);
    await syncEverythingToCloud(newState);
  };

  const resetData = () => {
    if (window.confirm("¿Seguro? Se borrarán todos los datos locales.")) {
      const emptyState = { products: [], clients: [], sales: [], purchases: [], consumptions: [] };
      setState(emptyState);
      localStorage.removeItem('coffeemaster_data');
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `backup_latostadora_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = async (jsonData: string) => {
    try {
      const data: AppState = JSON.parse(jsonData);
      setState(data);
      await syncEverythingToCloud(data);
      alert("Importación exitosa.");
    } catch (e) {
      alert("Error al importar el archivo.");
    }
  };

  const toggleSaveLock = () => setIsSaveLocked(!isSaveLocked);
  
  const dataSize = (JSON.stringify(state).length / 1024).toFixed(2) + " KB";

  return (
    <StoreContext.Provider value={{ 
        ...state, 
        addProduct, updateProduct, deleteProduct, 
        addClient, updateClient, deleteClient, 
        addSale, deleteSale, addPaymentToSale,
        addPurchase, updatePurchase, deletePurchase, addConsumption,
        resetData, exportData, importData,
        isSaveLocked, toggleSaveLock, 
        dataSize, isLoading, syncStatus,
        pushToCloud: async () => await syncEverythingToCloud(state),
        pullFromCloud,
        setSyncId: async (id) => { setState(p => ({...p, syncId: id})); return true; },
        createSyncSession: async () => { 
          const id = Math.random().toString(36).substring(7); 
          setState(p => ({...p, syncId: id})); 
          return id; 
        },
        isSyncing: syncStatus === 'syncing'
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error('useStore debe usarse dentro de StoreProvider');
  return context;
};
