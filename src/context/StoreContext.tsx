import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Product, Client, Sale, Purchase, Consumption } from '../types';
import { supabase } from '../services/supabaseClient';
import { loadSalesInPages, toSaleItemsRow } from '../services/salesLoader';
import { createRefreshQueue } from '../services/refreshQueue';

const TABLES = ['products', 'clients', 'sales', 'purchases', 'consumptions', 'settings'] as const;
type StoreTable = typeof TABLES[number];

interface StoreContextType extends AppState {
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addClient: (c: Client) => Promise<void>;
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addSale: (s: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addPurchase: (p: Purchase) => Promise<void>;
  addConsumption: (c: Consumption) => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
  monthlyGoal: number;
  stockThreshold: number;
  updateGlobalSettings: (g: number, t: number) => Promise<void>;
  isLoading: boolean;
  isRefreshing: boolean;
  loadErrors: Record<string, string>;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const toProductRow = (p: Product) => ({
  id: p.id,
  name: p.name,
  description: p.description || '',
  category: p.category || 'Otros',
  cost_price: Number(p.costPrice) || 0,
  margin_percentage: Number(p.marginPercentage) || 0,
  selling_price: Number(p.sellingPrice) || 0,
  stock: Number(p.stock) || 0,
  image_url: p.imageUrl || ''
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
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initialRequest = useRef<Promise<void> | null>(null);

  const readTable = async (table: StoreTable) => {
    if (table === 'sales') return loadSalesInPages(supabase);
    const query = table === 'settings'
      ? supabase.from(table).select('*').eq('id', 'global_config').maybeSingle()
      : supabase.from(table).select('*').order(['products', 'clients'].includes(table) ? 'name' : 'date', { ascending: ['products', 'clients'].includes(table) });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const applyTable = (table: StoreTable, data: any) => {
    switch (table) {
      case 'products': setProducts(data.map((x: any) => ({ ...x, costPrice: x.cost_price, marginPercentage: x.margin_percentage, sellingPrice: x.selling_price, imageUrl: x.image_url || '' }))); break;
      case 'clients': setClients(data.map((x: any) => ({ ...x, totalSpent: x.total_spent }))); break;
      case 'sales': setSales(data.map((x: any) => ({ ...x, clientId: x.client_id, clientName: x.client_name, amountPaid: x.amount_paid, paymentMethod: x.payment_method, items: x.items || [] }))); break;
      case 'purchases': setPurchases(data.map((x: any) => ({ ...x, productId: x.product_id, productName: x.product_name, unitCost: x.unit_cost, totalCost: x.total_cost }))); break;
      case 'consumptions': setConsumptions(data.map((x: any) => ({ ...x, productId: x.product_id, productName: x.product_name }))); break;
      case 'settings': if (data) { setMonthlyGoal(data.monthly_goal); setStockThreshold(data.stock_threshold); } break;
    }
  };

  const executeRefresh = async (tables: StoreTable[]) => {
    setIsRefreshing(true);
    try {
      const results = await Promise.allSettled(tables.map(async table => {
        const data = await readTable(table);
        applyTable(table, data);
      }));
      setLoadErrors(previous => {
        const errors = { ...previous };
        results.forEach((result, index) => {
          const table = tables[index];
          if (result.status === 'rejected') {
            errors[table] = result.reason?.message || 'No se pudo consultar la tabla.';
            console.error('Error de lectura en ' + table + ':', result.reason);
          } else {
            delete errors[table];
          }
        });
        return errors;
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const queue = useRef<ReturnType<typeof createRefreshQueue<StoreTable>> | null>(null);
  if (!queue.current) queue.current = createRefreshQueue<StoreTable>(executeRefresh);
  const refreshTables = (tables: readonly StoreTable[]) => queue.current!(tables);
  const refreshData = () => refreshTables(TABLES);

  useEffect(() => {
    let active = true;
    if (!initialRequest.current) initialRequest.current = refreshData();
    void initialRequest.current.then(() => { if (active) setIsLoading(false); });

    const changed = new Set<StoreTable>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = supabase
      .channel('la_tostadora_v6')
      .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
        if (!TABLES.includes(payload.table as StoreTable)) return;
        changed.add(payload.table as StoreTable);
        clearTimeout(timer);
        timer = setTimeout(() => {
          const tables = [...changed];
          changed.clear();
          void refreshTables(tables);
        }, 300);
      })
      .subscribe();

    return () => {
      active = false;
      clearTimeout(timer);
      supabase.removeChannel(sub);
    };
  }, []);

  const addProduct = async (p: Product) => {
    const { error } = await supabase.from('products').insert([toProductRow(p)]);

    if (error) {
      console.error('Error al crear producto:', error);
      alert('No se pudo crear el producto.');
      throw error;
    }

    await refreshTables(["products"]);
  };

  const updateProduct = async (p: Product) => {
    const row = toProductRow(p);
    const { id, ...payload } = row;

    const { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('Error al actualizar producto:', error);
      alert('No se pudo actualizar el producto.');
      throw error;
    }

    await refreshTables(["products"]);
  };

  const addPurchase = async (p: Purchase) => {
    const { error } = await supabase.from('purchases').insert([{
      id: p.id,
      date: p.date,
      product_id: p.productId,
      product_name: p.productName,
      quantity: p.quantity,
      unit_cost: p.unitCost,
      total_cost: p.totalCost
    }]);

    if (error) {
      console.error('Error al cargar compra:', error);
      alert('No se pudo cargar la compra.');
      throw error;
    }

    const prod = products.find(x => x.id === p.productId);
    if (prod) {
      const { error: productError } = await supabase
        .from('products')
        .update({
          stock: prod.stock + p.quantity,
          cost_price: p.unitCost
        })
        .eq('id', p.productId);

      if (productError) {
        console.error('Error al actualizar stock por compra:', productError);
        alert('La compra se cargó, pero no se pudo actualizar el stock.');
        throw productError;
      }
    }

    await refreshTables(["purchases","products"]);
  };

  const addConsumption = async (c: Consumption) => {
    const { error } = await supabase.from('consumptions').insert([{
      id: c.id,
      date: c.date,
      product_id: c.productId,
      product_name: c.productName,
      quantity: c.quantity,
      reason: c.reason
    }]);

    if (error) {
      console.error('Error al cargar consumo:', error);
      alert('No se pudo cargar el consumo.');
      throw error;
    }

    const prod = products.find(x => x.id === c.productId);
    if (prod) {
      const { error: productError } = await supabase
        .from('products')
        .update({ stock: prod.stock - c.quantity })
        .eq('id', c.productId);

      if (productError) {
        console.error('Error al actualizar stock por consumo:', productError);
        alert('El consumo se cargó, pero no se pudo actualizar el stock.');
        throw productError;
      }
    }

    await refreshTables(["consumptions","products"]);
  };

  const updateGlobalSettings = async (g: number, t: number) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'global_config', monthly_goal: g, stock_threshold: t });

    if (error) {
      console.error('Error al actualizar configuración:', error);
      alert('No se pudo actualizar la configuración.');
      throw error;
    }

    await refreshTables(["settings"]);
  };

  const importData = async (jsonData: string) => {
    setIsLoading(true);

    try {
      const data = JSON.parse(jsonData);

      if (data.products) {
        for (const p of data.products) {
          const { error } = await supabase.from('products').upsert({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            cost_price: p.costPrice,
            margin_percentage: p.marginPercentage,
            selling_price: p.sellingPrice,
            stock: p.stock,
            image_url: p.imageUrl
          });

          if (error) throw error;
        }
      }

      if (data.sales) {
        for (const s of data.sales) {
          const { error } = await supabase.from('sales').upsert({
            id: s.id,
            client_id: s.clientId,
            client_name: s.clientName,
            date: s.date,
            total: s.total,
            amount_paid: s.amountPaid,
            balance: s.balance,
            payment_method: s.paymentMethod,
            items: toSaleItemsRow(s.items || [])
          });

          if (error) throw error;
        }
      }

      await refreshData();
      alert('¡Sincronización completa!');
    } catch (e) {
      console.error('Error al importar:', e);
      alert('Error al importar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider value={{
      products,
      clients,
      sales,
      purchases,
      consumptions,
      isLoading,
      isRefreshing,
      loadErrors,
      monthlyGoal,
      stockThreshold,

      addProduct,
      updateProduct,

      deleteProduct: async (id) => {
        const { error } = await supabase.from('products').delete().eq('id', id);

        if (error) {
          console.error('Error al borrar producto:', error);
          alert('No se pudo borrar el producto.');
          throw error;
        }

        await refreshTables(["products"]);
      },

      addClient: async (c) => {
        const { error } = await supabase.from('clients').insert([{
          id: c.id,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          notes: c.notes || null,
          total_spent: c.totalSpent || 0
        }]);

        if (error) {
          console.error('Error al crear cliente:', error);
          alert('No se pudo crear el cliente.');
          throw error;
        }

        await refreshTables(["clients"]);
      },

      updateClient: async (c) => {
        const { error } = await supabase.from('clients').update({
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          notes: c.notes || null,
          total_spent: c.totalSpent || 0
        }).eq('id', c.id);

        if (error) {
          console.error('Error al actualizar cliente:', error);
          alert('No se pudo actualizar el cliente.');
          throw error;
        }

        await refreshTables(["clients"]);
      },

      deleteClient: async (id) => {
        const { error } = await supabase.from('clients').delete().eq('id', id);

        if (error) {
          console.error('Error al borrar cliente:', error);
          alert('No se pudo borrar el cliente.');
          throw error;
        }

        await refreshTables(["clients"]);
      },

      addSale: async (s) => {
        const { error } = await supabase.from('sales').insert([{
          id: s.id,
          client_id: s.clientId,
          client_name: s.clientName,
          date: s.date,
          total: s.total,
          amount_paid: s.amountPaid,
          balance: s.balance,
          payment_method: s.paymentMethod,
          items: toSaleItemsRow(s.items || [])
        }]);

        if (error) {
          console.error('Error al registrar venta:', error);
          alert('No se pudo registrar la venta.');
          throw error;
        }

        for (const item of s.items) {
          const p = products.find(x => x.id === item.id);
          if (p) {
            const { error: productError } = await supabase
              .from('products')
              .update({ stock: p.stock - item.quantity })
              .eq('id', p.id);

            if (productError) {
              console.error('Error al descontar stock:', productError);
              alert('La venta se registró, pero no se pudo descontar el stock.');
              throw productError;
            }
          }
        }

        await refreshTables(["sales","products"]);
      },

      deleteSale: async (id) => {
        const saleToDelete = sales.find(s => s.id === id);

        if (saleToDelete && saleToDelete.items) {
          for (const item of saleToDelete.items) {
            const p = products.find(x => x.id === item.id);
            if (p) {
              const { error: productError } = await supabase
                .from('products')
                .update({ stock: p.stock + item.quantity })
                .eq('id', p.id);

              if (productError) {
                console.error('Error al restaurar stock:', productError);
                alert('No se pudo restaurar el stock de la venta.');
                throw productError;
              }
            }
          }
        }

        const { error } = await supabase.from('sales').delete().eq('id', id);

        if (error) {
          console.error('Error al eliminar venta:', error);
          alert('No se pudo eliminar la venta.');
          throw error;
        }

        await refreshTables(["sales","products"]);
      },

      addPurchase,
      addConsumption,
      updateGlobalSettings,
      importData,
      refreshData
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
