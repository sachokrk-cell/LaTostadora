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
  monthlyGoal: number;
  stockThreshold: number;
  updateGlobalSettings: (goal: number, threshold: number) => Promise<void>;
  syncId: string | undefined;
  setSyncId: (id: string) => void;
  pullFromLegacyCloud: (phrase: string) => Promise<void>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// --- MAPEADORES (TRADUCTORES) ---
const mapProductToDb = (p: Product) => ({
  id: p.id, name: p.name, description: p.description, category: p.category,
  cost_price: p.costPrice, margin_percentage: p.marginPercentage,
  selling_price: p.sellingPrice, stock: p.stock, image_url: p.imageUrl
});

const mapDbToProduct = (p: any): Product => ({
  ...p, costPrice: p.cost_price, marginPercentage: p.margin_percentage,
  sellingPrice: p.selling_price, imageUrl: p.image_url, history: []
});

const mapClientToDb = (c: Client) => ({
  id: c.id, name: c.name, email: c.email, phone: c.phone, notes: c.notes, total_spent: c.totalSpent
});

const mapDbToClient = (c: any): Client => ({
  ...c, totalSpent: c.total_spent
});

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

  const setSyncId = (id: string) => { setSyncIdState(id); localStorage.setItem('lt_sync_phrase', id); };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [{ data: p }, { data: c }, { data: s }, { data: sett }] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('sales').select('*, items:sale_items(*)'),
        supabase.from('settings').select('*').eq('id', 'global_config').single()
      ]);
      if (p) setProducts(p.map(mapDbToProduct));
      if (c) setClients(c.map(mapDbToClient));
      if (s) setSales(s.map((sale: any) => ({
        ...sale, clientId: sale.client_id, clientName: sale.client_name, amountPaid: sale.amount_paid,
        paymentMethod: sale.payment_method, items: sale.items.map((i: any) => ({ ...i, appliedPrice: i.applied_price }))
      })));
      if (sett) { setMonthlyGoal(sett.monthly_goal); setStockThreshold(sett.stock_threshold); }
    } finally { setIsLoading(false); }
  };

  const pullFromLegacyCloud = async (phrase: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('coffee_sync').select('data').eq('id', phrase.toUpperCase()).single();
      if (error || !data) throw new Error("Frase no encontrada");
      const legacy = data.data;

      // MIGRACIÓN CON TRADUCCIÓN
      if (legacy.products?.length) await supabase.from('products').upsert(legacy.products.map(mapProductToDb));
      if (legacy.clients?.length) await supabase.from('clients').upsert(legacy.clients.map(mapClientToDb));
      if (legacy.sales?.length) {
          for (const sale of legacy.sales) {
              await supabase.from('sales').upsert({
                  id: sale.id, client_id: sale.clientId, client_name: sale.clientName,
                  date: sale.date, total: sale.total, payment_method: sale.paymentMethod, 
                  amount_paid: sale.amountPaid, balance: sale.balance
              });
              if (sale.items?.length) {
                  await supabase.from('sale_items').upsert(sale.items.map((i: any) => ({
                      sale_id: sale.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice
                  })));
              }
          }
      }
      setSyncId(phrase);
      await refreshData();
    } catch (e) { alert("Error al recuperar clave: " + phrase); } finally { setIsLoading(false); }
  };

  useEffect(() => { refreshData(); }, []);

  return (
    <StoreContext.Provider value={{ 
        products, clients, sales, purchases, consumptions,
        addProduct: async (p) => { await supabase.from('products').insert([mapProductToDb(p)]); refreshData(); },
        updateProduct: async (p) => { await supabase.from('products').update(mapProductToDb(p)).eq('id', p.id); refreshData(); },
        deleteProduct: async (id) => { await supabase.from('products').delete().eq('id', id); refreshData(); },
        addClient: async (c) => { await supabase.from('clients').insert([mapClientToDb(c)]); refreshData(); },
        updateClient: async (c) => { await supabase.from('clients').update(mapClientToDb(c)).eq('id', c.id); refreshData(); },
        deleteClient: async (id) => { await supabase.from('clients').delete().eq('id', id); refreshData(); },
        addSale: async (s) => { 
            await supabase.from('sales').insert([{ id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date, total: s.total, balance: s.balance, amount_paid: s.amountPaid, payment_method: s.paymentMethod }]);
            await supabase.from('sale_items').insert(s.items.map(i => ({ sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice })));
            refreshData(); 
        },
        deleteSale: async (id) => { await supabase.from('sales').delete().eq('id', id); refreshData(); },
        addPaymentToSale: async (id, pay) => { 
            const sale = sales.find(s => s.id === id);
            if(sale) await supabase.from('sales').update({ amount_paid: sale.amountPaid + pay.amount, balance: sale.balance - pay.amount }).eq('id', id);
            refreshData(); 
        },
        addConsumption: async (c) => { 
            await supabase.from('consumptions').insert([{ id: c.id, product_id: c.productId, product_name: c.productName, date: c.date, quantity: c.quantity, reason: c.reason }]);
            const prod = products.find(p => p.id === c.productId);
            if(prod) await supabase.from('products').update({ stock: prod.stock - c.quantity }).eq('id', prod.id);
            refreshData(); 
        },
        addPurchase: async (p) => { /* lógica de compra similar */ refreshData(); },
        updatePurchase: async (p) => { refreshData(); },
        deletePurchase: async (id) => { refreshData(); },
        monthlyGoal, stockThreshold, updateGlobalSettings: async (g, t) => { await supabase.from('settings').upsert({id: 'global_config', monthly_goal: g, stock_threshold: t}); setMonthlyGoal(g); setStockThreshold(t); },
        syncId, setSyncId, pullFromLegacyCloud, isLoading, refreshData
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
