import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Product, Client, Sale, Purchase, Consumption } from '../types';
import { supabase } from '../services/supabaseClient';

interface StoreContextType extends AppState {
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addClient: (c: Client) => Promise<void>;
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addSale: (s: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
  monthlyGoal: number;
  stockThreshold: number;
  updateGlobalSettings: (g: number, t: number) => Promise<void>;
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
  const [monthlyGoal, setMonthlyGoal] = useState(1000000);
  const [stockThreshold, setStockThreshold] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [p, c, s, sett] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('clients').select('*').order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').order('date', { ascending: false }),
        supabase.from('settings').select('*').eq('id', 'global_config').maybeSingle()
      ]);
      if (p.data) setProducts(p.data.map((x: any) => ({ ...x, costPrice: x.cost_price, marginPercentage: x.margin_percentage, sellingPrice: x.selling_price, imageUrl: x.image_url })));
      if (c.data) setClients(c.data.map((x: any) => ({ ...x, totalSpent: x.total_spent })));
      if (s.data) setSales(s.data.map((x: any) => ({ ...x, clientId: x.client_id, clientName: x.client_name, amountPaid: x.amount_paid, items: x.items.map((i: any) => ({ ...i, appliedPrice: i.applied_price })) })));
      if (sett.data) { setMonthlyGoal(sett.data.monthly_goal); setStockThreshold(sett.data.stock_threshold); }
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    refreshData();
    const sub = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public' }, () => refreshData()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const importData = async (jsonData: string) => {
    setIsLoading(true);
    try {
      const data = JSON.parse(jsonData);
      
      // 1. IMPORTAR PRODUCTOS (De a uno por las imágenes pesadas)
      if (data.products) {
        for (const p of data.products) {
          await supabase.from('products').upsert({
            id: p.id, name: p.name, description: p.description, category: p.category,
            cost_price: p.costPrice, margin_percentage: p.marginPercentage,
            selling_price: p.sellingPrice, stock: p.stock, image_url: p.imageUrl
          });
        }
      }

      // 2. IMPORTAR CLIENTES
      if (data.clients) {
        for (const c of data.clients) {
          await supabase.from('clients').upsert({
            id: c.id, name: c.name, email: c.email, phone: c.phone, notes: c.notes, total_spent: c.totalSpent
          });
        }
      }

      // 3. IMPORTAR VENTAS (Especial atención a marzo y abril)
      if (data.sales) {
        for (const s of data.sales) {
          const { error: saleError } = await supabase.from('sales').upsert({
            id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date,
            total: s.total, amount_paid: s.amountPaid, balance: s.balance, payment_method: s.paymentMethod
          });
          
          if (!saleError && s.items) {
            await supabase.from('sale_items').upsert(s.items.map((i: any) => ({
              sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice
            })));
          }
        }
      }

      // 4. IMPORTAR CONSUMOS Y COMPRAS
      if (data.consumptions) {
        for (const cons of data.consumptions) {
          await supabase.from('consumptions').upsert({
            id: cons.id, date: cons.date, product_id: cons.productId, product_name: cons.productName,
            quantity: cons.quantity, reason: cons.reason
          });
        }
      }

      await refreshData();
      alert("¡RECUPERACIÓN COMPLETA! Se han procesado todos los registros hasta el día de hoy.");
    } catch (e) {
      alert("Error en la importación. Es posible que el archivo sea demasiado grande para la conexión actual.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider value={{ 
      products, clients, sales, purchases: [], consumptions: [], isLoading, monthlyGoal, stockThreshold,
      addProduct: async (p) => { await supabase.from('products').insert([{ ...p, cost_price: p.costPrice, margin_percentage: p.marginPercentage, selling_price: p.sellingPrice, image_url: p.imageUrl }]); },
      updateProduct: async (p) => { await supabase.from('products').update({ ...p, cost_price: p.costPrice, margin_percentage: p.marginPercentage, selling_price: p.sellingPrice, image_url: p.imageUrl }).eq('id', p.id); },
      deleteProduct: async (id) => { await supabase.from('products').delete().eq('id', id); },
      addClient: async (c) => { await supabase.from('clients').insert([{ ...c, total_spent: c.totalSpent }]); },
      updateClient: async (c) => { await supabase.from('clients').update({ ...c, total_spent: c.totalSpent }).eq('id', c.id); },
      deleteClient: async (id) => { await supabase.from('clients').delete().eq('id', id); },
      addSale: async (s) => {
        await supabase.from('sales').insert([{ id: s.id, client_id: s.clientId, client_name: s.clientName, date: s.date, total: s.total, amount_paid: s.amountPaid, balance: s.balance, payment_method: s.paymentMethod }]);
        await supabase.from('sale_items').insert(s.items.map(i => ({ sale_id: s.id, product_id: i.id, name: i.name, quantity: i.quantity, applied_price: i.appliedPrice })));
      },
      deleteSale: async (id) => { await supabase.from('sales').delete().eq('id', id); },
      importData, refreshData, updateGlobalSettings: async (g, t) => { await supabase.from('settings').upsert({ id: 'global_config', monthly_goal: g, stock_threshold: t }); }
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore error');
  return context;
};
