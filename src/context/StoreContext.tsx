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
  updatePurchase: (purchase: Purchase) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  addConsumption: (consumption: Consumption) => Promise<void>;
  
  // Ajustes Globales
  monthlyGoal: number;
  stockThreshold: number;
  updateGlobalSettings: (goal: number, threshold: number) => Promise<void>;

  // FUNCIONES DE LA NUBE (PARA RECUPERAR TUS DATOS)
  syncId: string | undefined;
  setSyncId: (id: string) => void;
  pullFromLegacyCloud: (phrase: string) => Promise<void>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [syncId, setSyncIdState] = useState<string | undefined>(localStorage.getItem('lt_sync_phrase') || undefined);
  
  const [monthlyGoal, setMonthlyGoal] = useState(1000000);
  const [stockThreshold, setStockThreshold] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  const setSyncId = (id: string) => {
    setSyncIdState(id);
    localStorage.setItem('lt_sync_phrase', id);
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [{ data: p }, { data: c }, { data: s }, { data: cons }, { data: sett }] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('sales').select('*, items:sale_items(*)'),
        supabase.from('consumptions').select('*'),
        supabase.from('settings').select('*').eq('id', 'global_config').single()
      ]);
      if (p) setProducts(p);
      if (c) setClients(c);
      if (s) setSales(s);
      if (cons) setConsumptions(cons);
      if (sett) { setMonthlyGoal(sett.monthly_goal); setStockThreshold(sett.stock_threshold); }
    } finally { setIsLoading(false); }
  };

  // --- FUNCIÓN DE RESCATE (NUBE) ---
  const pullFromLegacyCloud = async (phrase: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coffee_sync')
        .select('data')
        .eq('id', phrase)
        .single();

      if (error || !data) throw new Error("Frase no encontrada");

      const legacyData = data.data; // El JSON con todo

      // MIGRACIÓN AUTOMÁTICA A TABLAS NUEVAS
      if (legacyData.products?.length) await supabase.from('products').upsert(legacyData.products);
      if (legacyData.clients?.length) await supabase.from('clients').upsert(legacyData.clients);
      if (legacyData.sales?.length) {
          // Las ventas son más complejas por los items
          for (const sale of legacyData.sales) {
              await supabase.from('sales').upsert({
                  id: sale.id, client_id: sale.clientId, client_name: sale.clientName,
                  date: sale.date, subtotal: sale.subtotal, total: sale.total,
                  payment_method: sale.paymentMethod, amount_paid: sale.amountPaid, balance: sale.balance
              });
              if (sale.items?.length) {
                  const items = sale.items.map((i: any) => ({
                      sale_id: sale.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice
                  }));
                  await supabase.from('sale_items').upsert(items);
              }
          }
      }
      if (legacyData.consumptions?.length) await supabase.from('consumptions').upsert(legacyData.consumptions);

      setSyncId(phrase);
      await refreshData();
      alert("¡Datos recuperados con éxito!");
    } catch (e) {
      alert("Error al recuperar: Verifica tu frase.");
    } finally { setIsLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  // (Aquí irían el resto de funciones addProduct, addSale, etc. del paso anterior)
  // ... mantén las funciones addProduct, addSale que te pasé antes para que graben en tablas individuales ...

  return (
    <StoreContext.Provider value={{ 
        products, clients, sales, purchases, consumptions,
        addProduct: async (p) => { await supabase.from('products').insert([p]); refreshData(); },
        updateProduct: async (p) => { await supabase.from('products').update(p).eq('id', p.id); refreshData(); },
        deleteProduct: async (id) => { await supabase.from('products').delete().eq('id', id); refreshData(); },
        addClient: async (c) => { await supabase.from('clients').insert([c]); refreshData(); },
        updateClient: async (c) => { await supabase.from('clients').update(c).eq('id', c.id); refreshData(); },
        deleteClient: async (id) => { await supabase.from('clients').delete().eq('id', id); refreshData(); },
        addSale: async (s) => { 
            await supabase.from('sales').insert([{ id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date, total: s.total, balance: s.balance, amount_paid: s.amountPaid, payment_method: s.paymentMethod }]);
            const items = s.items.map(i => ({ sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice }));
            await supabase.from('sale_items').insert(items);
            refreshData(); 
        },
        deleteSale: async (id) => { await supabase.from('sales').delete().eq('id', id); refreshData(); },
        addPaymentToSale: async (id, pay) => { /* lógica de update en sales */ refreshData(); },
        addConsumption: async (c) => { await supabase.from('consumptions').insert([c]); refreshData(); },
        addPurchase: async (p) => { refreshData(); },
        updatePurchase: async (p) => { refreshData(); },
        deletePurchase: async (id) => { refreshData(); },
        monthlyGoal, stockThreshold, updateGlobalSettings: async (g, t) => { await supabase.from('settings').upsert({id: 'global_config', monthly_goal: g, stock_threshold: t}); setMonthlyGoal(g); setStockThreshold(t); },
        syncId, setSyncId, pullFromLegacyCloud,
        isLoading, refreshData
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
