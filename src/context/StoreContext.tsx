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
  
  // Ajustes Globales Sincronizados
  monthlyGoal: number;
  stockThreshold: number;
  updateGlobalSettings: (goal: number, threshold: number) => Promise<void>;

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

  // 1. CARGA INICIAL DESDE SUPABASE (MULTIDISPOSITIVO)
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [
        { data: p }, { data: c }, { data: s }, { data: cons }, { data: sett }
      ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('sales').select('*, items:sale_items(*)'), // Trae venta con sus items
        supabase.from('consumptions').select('*'),
        supabase.from('settings').select('*').eq('id', 'global_config').single()
      ]);

      if (p) setProducts(p);
      if (c) setClients(c);
      if (s) setSales(s);
      if (cons) setConsumptions(cons);
      if (sett) {
        setMonthlyGoal(sett.monthly_goal);
        setStockThreshold(sett.stock_threshold);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // 2. GESTIÓN DE AJUSTES GLOBALES
  const updateGlobalSettings = async (goal: number, threshold: number) => {
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 'global_config', monthly_goal: goal, stock_threshold: threshold });

    if (!error) {
      setMonthlyGoal(goal);
      setStockThreshold(threshold);
    }
  };

  // 3. PRODUCTOS
  const addProduct = async (p: Product) => {
    const { error } = await supabase.from('products').insert([p]);
    if (!error) setProducts(prev => [...prev, p]);
  };

  const updateProduct = async (p: Product) => {
    const { error } = await supabase.from('products').update(p).eq('id', p.id);
    if (!error) setProducts(prev => prev.map(old => old.id === p.id ? p : old));
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
  };

  // 4. CLIENTES
  const addClient = async (c: Client) => {
    const { error } = await supabase.from('clients').insert([c]);
    if (!error) setClients(prev => [...prev, c]);
  };

  const updateClient = async (c: Client) => {
    const { error } = await supabase.from('clients').update(c).eq('id', c.id);
    if (!error) setClients(prev => prev.map(old => old.id === c.id ? c : old));
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) setClients(prev => prev.filter(c => c.id !== id));
  };

  // 5. VENTAS (OPERACIÓN COMPLEJA)
  const addSale = async (s: Sale) => {
    // a. Insertar cabecera de venta
    const { error: saleError } = await supabase.from('sales').insert([{
      id: s.id,
      client_id: s.clientId,
      client_name: s.clientName,
      date: s.date,
      subtotal: s.subtotal,
      discount_amount: s.discountAmount,
      total: s.total,
      payment_method: s.paymentMethod,
      amount_paid: s.amountPaid,
      balance: s.balance
    }]);

    if (saleError) return;

    // b. Insertar items de la venta
    const itemsToInsert = s.items.map(item => ({
      sale_id: s.id,
      product_id: item.id,
      name: item.name,
      quantity: item.quantity,
      applied_price: item.appliedPrice
    }));
    await supabase.from('sale_items').insert(itemsToInsert);

    // c. Actualizar stock en DB y locales
    for (const item of s.items) {
      const product = products.find(p => p.id === item.id);
      if (product) {
        const newStock = product.stock - item.quantity;
        await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
      }
    }

    // d. Actualizar gasto total del cliente
    if (s.clientId) {
        const client = clients.find(c => c.id === s.clientId);
        if (client) {
            await supabase.from('clients').update({ total_spent: client.totalSpent + s.total }).eq('id', client.id);
        }
    }

    refreshData(); // Recargar todo para asegurar sincronía
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (!error) refreshData();
  };

  const addPaymentToSale = async (saleId: string, payment: PaymentRecord) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const newAmountPaid = sale.amountPaid + payment.amount;
    const newBalance = sale.balance - payment.amount;

    const { error } = await supabase.from('sales').update({
      amount_paid: newAmountPaid,
      balance: newBalance
    }).eq('id', saleId);

    if (!error) refreshData();
  };

  // 6. CONSUMOS
  const addConsumption = async (c: Consumption) => {
    const { error } = await supabase.from('consumptions').insert([{
        id: c.id,
        product_id: c.productId,
        product_name: c.productName,
        date: c.date,
        quantity: c.quantity,
        reason: c.reason
    }]);

    if (!error) {
        const product = products.find(p => p.id === c.productId);
        if (product) {
            await supabase.from('products').update({ stock: product.stock - c.quantity }).eq('id', product.id);
        }
        refreshData();
    }
  };

  // 7. COMPRAS
  const addPurchase = async (p: Purchase) => {
    const product = products.find(prod => prod.id === p.productId);
    if (product) {
        const newStock = Number(product.stock) + Number(p.quantity);
        const newSelling = product.marginPercentage > 0 
            ? Math.round(p.unitCost * (1 + product.marginPercentage / 100)) 
            : product.sellingPrice;

        await supabase.from('products').update({ 
            stock: newStock, 
            cost_price: p.unitCost,
            selling_price: newSelling 
        }).eq('id', product.id);
        
        refreshData();
    }
  };

  // Mantenemos estas por compatibilidad, pero ahora disparan refresh
  const updatePurchase = async (p: Purchase) => { refreshData(); };
  const deletePurchase = async (id: string) => { refreshData(); };

  return (
    <StoreContext.Provider value={{ 
        products, clients, sales, purchases, consumptions,
        addProduct, updateProduct, deleteProduct, 
        addClient, updateClient, deleteClient, 
        addSale, deleteSale, addPaymentToSale,
        addPurchase, updatePurchase, deletePurchase, addConsumption,
        monthlyGoal, stockThreshold, updateGlobalSettings,
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
