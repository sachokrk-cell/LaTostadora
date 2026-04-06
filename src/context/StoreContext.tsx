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
  addConsumption: (consumption: Consumption) => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
  monthlyGoal: number;
  stockThreshold: number;
  updateGlobalSettings: (goal: number, threshold: number) => Promise<void>;
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// --- MAPEADORES DE DATOS (DB <-> JS) ---
const mapProdToDb = (p: Product) => ({
  id: p.id, name: p.name, description: p.description, category: p.category,
  cost_price: p.costPrice, margin_percentage: p.marginPercentage,
  selling_price: p.sellingPrice, stock: p.stock, image_url: p.imageUrl
});

const mapDbToProd = (p: any): Product => ({
  id: p.id, name: p.name, description: p.description, category: p.category,
  costPrice: p.cost_price, marginPercentage: p.margin_percentage,
  sellingPrice: p.selling_price, stock: p.stock, imageUrl: p.image_url, history: []
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
  
  const [monthlyGoal, setMonthlyGoal] = useState(1000000);
  const [stockThreshold, setStockThreshold] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // --- CARGA DE DATOS DESDE SUPABASE ---
  const refreshData = async () => {
    try {
      const [p, c, s, pur, cons, sett] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').order('date', { ascending: false }),
        supabase.from('purchases').select('*').order('date', { ascending: false }),
        supabase.from('consumptions').select('*').order('date', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 'global_config').maybeSingle()
      ]);

      if (p.data) setProducts(p.data.map(mapDbToProd));
      if (c.data) setClients(c.data.map(mapDbToClient));
      if (s.data) setSales(s.data.map((x: any) => ({
        ...x,
        clientId: x.client_id,
        clientName: x.client_name,
        amountPaid: x.amount_paid,
        paymentMethod: x.payment_method,
        items: x.items.map((i: any) => ({ ...i, appliedPrice: i.applied_price }))
      })));
      if (pur.data) setPurchases(pur.data.map((x: any) => ({ ...x, productName: x.product_name, unitCost: x.unit_cost, totalCost: x.total_cost })));
      if (cons.data) setConsumptions(cons.data.map((x: any) => ({ ...x, productName: x.product_name })));
      if (sett.data) {
        setMonthlyGoal(sett.data.monthly_goal);
        setStockThreshold(sett.data.stock_threshold);
      }
    } catch (error) {
      console.error("Error al refrescar datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SINCRONIZACIÓN EN TIEMPO REAL ---
  useEffect(() => {
    refreshData();
    const channel = supabase.channel('realtime_store')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => refreshData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- FUNCIÓN DE IMPORTACIÓN MASIVA (RECUPERAR MARZO) ---
  const importData = async (jsonData: string) => {
    setIsLoading(true);
    try {
      const data = JSON.parse(jsonData);
      
      // Importación secuencial para no saturar con las imágenes pesadas
      if (data.products) {
        for (const p of data.products) {
          await supabase.from('products').upsert(mapProdToDb(p));
        }
      }

      if (data.clients) {
        for (const c of data.clients) {
          await supabase.from('clients').upsert(mapClientToDb(c));
        }
      }

      if (data.sales) {
        for (const s of data.sales) {
          await supabase.from('sales').upsert({
            id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date,
            total: s.total, amount_paid: s.amountPaid, balance: s.balance, payment_method: s.paymentMethod
          });
          if (s.items) {
            await supabase.from('sale_items').upsert(s.items.map((i: any) => ({
              sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice
            })));
          }
        }
      }

      await refreshData();
      alert("¡Importación completa! Todo está en la nube.");
    } catch (e) {
      alert("Error al procesar el archivo.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- CRUD OPERACIONES ---

  const addProduct = async (p: Product) => {
    await supabase.from('products').insert([mapProdToDb(p)]);
  };

  const updateProduct = async (p: Product) => {
    await supabase.from('products').update(mapProdToDb(p)).eq('id', p.id);
  };

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
  };

  const addClient = async (c: Client) => {
    await supabase.from('clients').insert([mapClientToDb(c)]);
  };

  const updateClient = async (c: Client) => {
    await supabase.from('clients').update(mapClientToDb(c)).eq('id', c.id);
  };

  const deleteClient = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
  };

  const addSale = async (s: Sale) => {
    const { error: saleError } = await supabase.from('sales').insert([{
      id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date,
      total: s.total, amount_paid: s.amountPaid, balance: s.balance, payment_method: s.paymentMethod
    }]);

    if (!saleError) {
      await supabase.from('sale_items').insert(s.items.map(i => ({
        sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice
      })));

      // Actualización de Stock Automática
      for (const item of s.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
          await supabase.from('products').update({ stock: product.stock - item.quantity }).eq('id', product.id);
        }
      }

      // Actualización de gasto del cliente
      if (s.clientId) {
        const client = clients.find(c => c.id === s.clientId);
        if (client) {
          await supabase.from('clients').update({ total_spent: client.totalSpent + s.total }).eq('id', client.id);
        }
      }
    }
  };

  const deleteSale = async (id: string) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    // Devolver stock
    for (const item of sale.items) {
      const product = products.find(p => p.id === item.id);
      if (product) {
        await supabase.from('products').update({ stock: product.stock + item.quantity }).eq('id', product.id);
      }
    }

    // Restar gasto al cliente
    if (sale.clientId) {
        const client = clients.find(c => c.id === sale.clientId);
        if (client) {
            await supabase.from('clients').update({ total_spent: Math.max(0, client.totalSpent - sale.total) }).eq('id', client.id);
        }
    }

    await supabase.from('sales').delete().eq('id', id);
  };

  const addPaymentToSale = async (saleId: string, payment: PaymentRecord) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      await supabase.from('sales').update({
        amount_paid: sale.amountPaid + payment.amount,
        balance: sale.balance - payment.amount
      }).eq('id', saleId);
    }
  };

  const addPurchase = async (p: Purchase) => {
    await supabase.from('purchases').insert([{
        id: p.id, date: p.date, product_id: p.productId, product_name: p.productName,
        quantity: p.quantity, unit_cost: p.unitCost, total_cost: p.totalCost
    }]);
    
    const product = products.find(x => x.id === p.productId);
    if (product) {
        await supabase.from('products').update({ 
            stock: product.stock + p.quantity,
            cost_price: p.unitCost 
        }).eq('id', product.id);
    }
  };

  const addConsumption = async (c: Consumption) => {
    await supabase.from('consumptions').insert([{
        id: c.id, date: c.date, product_id: c.productId, product_name: c.productName,
        quantity: c.quantity, reason: c.reason
    }]);
    
    const product = products.find(x => x.id === c.productId);
    if (product) {
        await supabase.from('products').update({ stock: Math.max(0, product.stock - c.quantity) }).eq('id', product.id);
    }
  };

  const updateGlobalSettings = async (goal: number, threshold: number) => {
    await supabase.from('settings').upsert({ id: 'global_config', monthly_goal: goal, stock_threshold: threshold });
    setMonthlyGoal(goal);
    setStockThreshold(threshold);
  };

  return (
    <StoreContext.Provider value={{
      products, clients, sales, purchases, consumptions,
      addProduct, updateProduct, deleteProduct,
      addClient, updateClient, deleteClient,
      addSale, deleteSale, addPaymentToSale,
      addPurchase, addConsumption,
      importData, monthlyGoal, stockThreshold, updateGlobalSettings,
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
