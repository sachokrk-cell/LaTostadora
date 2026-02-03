
export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  costPrice: number;
  marginPercentage: number;
  sellingPrice: number;
  stock: number;
  category: string;
  history: CostHistory[];
}

export interface CostHistory {
  date: string;
  oldCost: number;
  newCost: number;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes: string;
  totalSpent: number;
  createdAt: string;
}

export interface CartItem extends Product {
  quantity: number;
  appliedPrice: number;
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: 'Efectivo' | 'Transferencia';
}

export interface Sale {
  id: string;
  clientId: string | null;
  clientName: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'Efectivo' | 'Transferencia';
  amountPaid: number;
  balance: number; // Lo que debe
  payments: PaymentRecord[]; // Historial de abonos
}

export interface Purchase {
  id: string;
  date: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface Consumption {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  date: string;
  reason?: string;
}

export interface AppState {
  products: Product[];
  clients: Client[];
  sales: Sale[];
  purchases: Purchase[];
  consumptions: Consumption[];
  syncId?: string;
  lastSync?: string;
}
