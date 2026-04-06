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
  addConsumption: (consumption: Consumption) => Promise<void>;
  monthlyGoal: number;
  stockThreshold: number;
  updateGlobalSettings: (goal: number, threshold: number) => Promise<void>;
  syncId: string | undefined;
  pullFromLegacyCloud: (phrase: string) => Promise<void>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// --- MAPEADORES DE DATOS (JS <-> DB) ---
const mapProdToDb = (p: any) => ({
  id: p.id, name: p.name, description: p.description || '', category: p.category || 'Otros',
  cost_price: p.costPrice || p.cost_price || 0, 
  margin_percentage: p.marginPercentage || p.margin_percentage || 30,
  selling_price: p.sellingPrice || p.selling_price || 0, 
  stock: p.stock || 0, 
  image_url: p.imageUrl || p.image_url || ''
});

const mapDbToProd = (p: any): Product => ({
  id: p.id, name: p.name, description: p.description, category: p.category,
  costPrice: p.cost_price, marginPercentage: p.margin_percentage,
  sellingPrice: p.selling_price, stock: p.stock, imageUrl: p.image_url, history: []
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [monthlyGoal, setMonthlyGoal] = useState(1000000);
  const [stockThreshold, setStockThreshold] = useState(10);
  const [syncId] = useState(localStorage.getItem('lt_sync_phrase') || undefined);
  const [isLoading, setIsLoading] = useState(true);

  // --- FUNCIÓN DE CARGA TOTAL ---
  const refreshData = async () => {
    const [{ data: p }, { data: c }, { data: s }, { data: sett }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('sales').select('*, items:sale_items(*)').order('date', { ascending: false }),
      supabase.from('settings').select('*').eq('id', 'global_config').single()
    ]);
    if (p) setProducts(p.map(mapDbToProd));
    if (c) setClients(c.map(cl => ({ ...cl, totalSpent: cl.total_spent })));
    if (s) setSales(s.map(sale => ({
      ...sale, clientId: sale.client_id, clientName: sale.client_name, amountPaid: sale.amount_paid,
      items: sale.items.map((i: any) => ({ ...i, appliedPrice: i.applied_price }))
    })));
    if (sett) { setMonthlyGoal(sett.monthly_goal); setStockThreshold(sett.stock_threshold); }
    setIsLoading(false);
  };

  // --- ¡TIEMPO REAL ACTIVADO! ---
  useEffect(() => {
    refreshData();
    // Escuchar cambios en la DB para actualizar todos los dispositivos en línea
    const channel = supabase.channel('realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => refreshData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- FUNCIÓN DE RESCATE (MIGRAR GWLFLL) ---
  const pullFromLegacyCloud = async (phrase: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('coffee_sync').select('data').eq('id', phrase.toUpperCase()).single();
      if (error || !data) throw new Error("Clave no encontrada en el sistema viejo");

      const legacy = data.data;

      // 1. Migrar Productos
      if (legacy.products?.length) {
        await supabase.from('products').upsert(legacy.products.map(mapProdToDb));
      }
      // 2. Migrar Clientes
      if (legacy.clients?.length) {
        await supabase.from('clients').upsert(legacy.clients.map((cl: any) => ({
          id: cl.id, name: cl.name, email: cl.email, phone: cl.phone, notes: cl.notes, total_spent: cl.totalSpent
        })));
      }
      // 3. Migrar Ventas (con sus items)
      if (legacy.sales?.length) {
        for (const s of legacy.sales) {
          await supabase.from('sales').upsert({
            id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date,
            total: s.total, payment_method: s.paymentMethod, amount_paid: s.amountPaid, balance: s.balance
          });
          if (s.items?.length) {
            await supabase.from('sale_items').upsert(s.items.map((i: any) => ({
              sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice
            })));
          }
        }
      }
      
      localStorage.setItem('lt_sync_phrase', phrase.toUpperCase());
      await refreshData();
      alert("¡Datos recuperados con éxito! Ahora todo está sincronizado en tiempo real.");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNCIONES DE ACCIÓN ---
  const addSale = async (s: Sale) => {
    const { error: saleErr } = await supabase.from('sales').insert([{
      id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date,
      total: s.total, payment_method: s.paymentMethod, amount_paid: s.amountPaid, balance: s.balance
    }]);
    if (!saleErr) {
      await supabase.from('sale_items').insert(s.items.map(i => ({
        sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice
      })));
      // El stock se actualiza solo porque refreshData() se dispara por el Realtime
    }
  };

  return (
    <StoreContext.Provider value={{ 
      products, clients, sales, purchases: [], consumptions: [],
      addProduct: async (p) => { await supabase.from('products').insert([mapProdToDb(p)]); },
      updateProduct: async (p) => { await supabase.from('products').update(mapProdToDb(p)).eq('id', p.id); },
      deleteProduct: async (id) => { await supabase.from('products').delete().eq('id', id); },
      addClient: async (c) => { await supabase.from('clients').insert([{ ...c, total_spent: c.totalSpent }]); },
      updateClient: async (c) => { await supabase.from('clients').update({ ...c, total_spent: c.totalSpent }).eq('id', c.id); },
      deleteClient: async (id) => { await supabase.from('clients').delete().eq('id', id); },
      addSale,
      deleteSale: async (id) => { await supabase.from('sales').delete().eq('id', id); },
      addPaymentToSale: async (id, pay) => { 
        const s = sales.find(x => x.id === id);
        if(s) await supabase.from('sales').update({ amount_paid: s.amountPaid + pay.amount, balance: s.balance - pay.amount }).eq('id', id);
      },
      addConsumption: async (c) => { await supabase.from('consumptions').insert([{ ...c, product_id: c.productId, product_name: c.productName }]); },
      addPurchase: async (p) => { /* Lógica similar */ },
      updatePurchase: async (p) => {}, deletePurchase: async (id) => {},
      monthlyGoal, stockThreshold, 
      updateGlobalSettings: async (g, t) => { await supabase.from('settings').upsert({id: 'global_config', monthly_goal: g, stock_threshold: t}); },
      syncId, pullFromLegacyCloud, isLoading, refreshData
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore debe usarse dentro de StoreProvider');
  return context;
};
