
import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Package, ShoppingBag, TrendingUp, X, Settings, Coffee, ShoppingCart, Award, List, Wallet, User as UserIcon } from 'lucide-react';
import { Sale } from '../types';

interface ModalProps {
  title: string;
  children?: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

const Modal = ({ title, children, onClose, maxWidth = 'max-w-2xl' }: ModalProps) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
    <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
      <div className="p-4 md:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl flex-shrink-0">
        <h3 className="text-lg md:text-xl font-bold text-coffee-900">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <X size={24} className="text-gray-500" />
        </button>
      </div>
      <div className="p-4 md:p-6 overflow-y-auto flex-1">
        {children}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { sales = [], products = [] } = useStore();
  const [activeModal, setActiveModal] = useState<'sales' | 'soldItems' | 'stock' | 'topProduct' | 'products' | 'outstanding' | null>(null);
  const [stockThreshold, setStockThreshold] = useState(() => {
    return Number(localStorage.getItem('coffeemaster_stock_threshold')) || 10;
  });

  useEffect(() => {
    localStorage.setItem('coffeemaster_stock_threshold', stockThreshold.toString());
  }, [stockThreshold]);

  const { metrics, lowStockProducts, topProductStats, currentMonthSales, monthlySoldItems, outstandingClients } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthSales = (sales || []).filter(s => {
      const d = new Date(s.date);
      return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalRevenue = monthSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const totalItemsSold = monthSales.reduce((acc, s) => {
        const itemQty = (s.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        return acc + itemQty;
    }, 0);
    
    const lowStock = (products || []).filter(p => (Number(p.stock) || 0) <= stockThreshold);

    // Cálculo de Cuentas por Cobrar
    const totalOutstanding = (sales || []).reduce((acc, s) => acc + (Number(s.balance) || 0), 0);
    const outstandingByClientMap: Record<string, { name: string, balance: number, count: number }> = {};
    
    (sales || []).forEach(s => {
      if (Number(s.balance) > 0) {
        const key = s.clientId || s.clientName;
        if (!outstandingByClientMap[key]) {
          outstandingByClientMap[key] = { name: s.clientName, balance: 0, count: 0 };
        }
        outstandingByClientMap[key].balance += Number(s.balance);
        outstandingByClientMap[key].count += 1;
      }
    });

    const soldItemsMap: Record<string, { name: string, qty: number, total: number }> = {};
    monthSales.forEach(s => (s.items || []).forEach(i => {
      if (!soldItemsMap[i.id]) soldItemsMap[i.id] = { name: i.name, qty: 0, total: 0 };
      const qty = Number(i.quantity) || 0;
      const price = Number(i.appliedPrice || i.sellingPrice) || 0;
      soldItemsMap[i.id].qty += qty;
      soldItemsMap[i.id].total += (price * qty);
    }));

    const getTopProduct = (salesList: Sale[]) => {
      const map: Record<string, { qty: number, name: string, total: number }> = {};
      salesList.forEach(s => (s.items || []).forEach(i => {
        if (!map[i.id]) map[i.id] = { qty: 0, name: i.name, total: 0 };
        const qty = Number(i.quantity) || 0;
        const price = Number(i.appliedPrice || i.sellingPrice) || 0;
        map[i.id].qty += qty;
        map[i.id].total += (price * qty);
      }));
      let topId = "";
      let max = -1;
      Object.entries(map).forEach(([id, data]) => { if (data.qty > max) { max = data.qty; topId = id; } });
      return max > 0 ? { ...map[topId], id: topId } : null;
    };

    return { 
      metrics: { totalRevenue, totalItemsSold, lowStockCount: lowStock.length, totalOutstanding },
      lowStockProducts: lowStock,
      currentMonthSales: [...monthSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      monthlySoldItems: Object.values(soldItemsMap).sort((a, b) => b.qty - a.qty),
      topProductStats: { month: getTopProduct(monthSales), allTime: getTopProduct(sales || []) },
      outstandingClients: Object.values(outstandingByClientMap).sort((a, b) => b.balance - a.balance)
    };
  }, [sales, products, stockThreshold]);

  const salesData = useMemo(() => {
    const data: any[] = [];
    for(let i=5; i>=0; i--) {
       const d = new Date();
       d.setMonth(d.getMonth() - i);
       const monthName = d.toLocaleString('es-ES', { month: 'short' });
       const targetMonth = d.getMonth();
       const targetYear = d.getFullYear();
       
       const monthlySales = (sales || []).filter(s => {
          const sd = new Date(s.date);
          return !isNaN(sd.getTime()) && sd.getMonth() === targetMonth && sd.getFullYear() === targetYear;
       });
       
       data.push({
         name: monthName,
         Ventas: monthlySales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
       });
    }
    return data;
  }, [sales]);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h2 className="text-2xl md:text-3xl font-bold text-coffee-900">Tablero de Control</h2>
            <p className="text-sm text-gray-500">Resumen general de tu cafetería</p>
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <div onClick={() => setActiveModal('sales')} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-amber-500 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Ventas Mes</p>
              <h3 className="text-2xl font-black text-gray-800">${(metrics?.totalRevenue || 0).toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-amber-100 rounded-full text-amber-600 group-hover:bg-amber-200 transition-colors"><DollarSign size={20} /></div>
          </div>
        </div>

        <div onClick={() => setActiveModal('soldItems')} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Unidades Mes</p>
              <h3 className="text-2xl font-black text-gray-800">{metrics?.totalItemsSold || 0}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-200 transition-colors"><ShoppingBag size={20} /></div>
          </div>
        </div>

        <div onClick={() => setActiveModal('outstanding')} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-indigo-600 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider">Por Cobrar</p>
              <h3 className="text-2xl font-black text-indigo-900">${(metrics?.totalOutstanding || 0).toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full text-indigo-600 group-hover:bg-indigo-200 transition-colors"><Wallet size={20} /></div>
          </div>
        </div>

        <div onClick={() => setActiveModal('stock')} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Alertas Stock</p>
              <h3 className="text-2xl font-black text-gray-800">{metrics?.lowStockCount || 0}</h3>
            </div>
            <div className="p-3 bg-red-100 rounded-full text-red-600 group-hover:bg-red-200 transition-colors"><Package size={20} /></div>
          </div>
        </div>

        <div onClick={() => setActiveModal('topProduct')} className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 group">
          <div className="flex justify-between items-center">
            <div className="overflow-hidden">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Top Producto</p>
              <h3 className="text-sm font-black text-gray-800 truncate">{topProductStats.month?.name || 'N/A'}</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600 group-hover:bg-green-200 transition-colors"><TrendingUp size={20} /></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-100">
        <h3 className="text-xl font-bold text-coffee-800 mb-6">Tendencia de Ventas Facturadas</h3>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value || 0).toLocaleString()}`} />
              <Bar name="Facturado ($)" dataKey="Ventas" fill="#8a6256" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {activeModal === 'sales' && (
        <Modal title="Historial de Ventas del Mes" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            {currentMonthSales && currentMonthSales.length > 0 ? (
              currentMonthSales.map(sale => (
                <div key={sale.id} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-bold text-gray-800 truncate">{sale.clientName || 'Sin Nombre'}</p>
                    <p className="text-xs text-gray-500">
                        {new Date(sale.date).toLocaleDateString()} - {(sale.items || []).length} productos
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-coffee-700">${(Number(sale.total) || 0).toLocaleString()}</p>
                    {Number(sale.balance) > 0 && <p className="text-[10px] text-red-500 font-bold">DEUDA: ${(Number(sale.balance) || 0).toLocaleString()}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-10">No hay ventas registradas este mes.</p>
            )}
          </div>
        </Modal>
      )}

      {activeModal === 'outstanding' && (
        <Modal title="Detalle de Cuentas por Cobrar" onClose={() => setActiveModal(null)}>
           <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4">
                 <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Saldo Total Pendiente</p>
                 <p className="text-3xl font-black text-indigo-900">${metrics.totalOutstanding.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                {outstandingClients.length > 0 ? (
                  outstandingClients.map((client, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                            <UserIcon size={20} />
                         </div>
                         <div>
                            <p className="font-black text-gray-800">{client.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{client.count} ventas pendientes</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-black text-red-600">${client.balance.toLocaleString()}</p>
                         <p className="text-[10px] font-black text-gray-400 uppercase">A Cobrar</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-10">No hay deudas pendientes. ¡Excelente!</p>
                )}
              </div>
           </div>
        </Modal>
      )}

      {activeModal === 'soldItems' && (
        <Modal title="Detalle de Productos Vendidos (Mes)" onClose={() => setActiveModal(null)}>
          <div className="space-y-2">
            {monthlySoldItems && monthlySoldItems.length > 0 ? (
              monthlySoldItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black">
                      {item.qty}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">Unidades vendidas</p>
                    </div>
                  </div>
                  <p className="font-black text-gray-700">${(Number(item.total) || 0).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-10">No hay unidades vendidas este mes.</p>
            )}
            <div className="mt-6 pt-4 border-t flex justify-center">
                <button 
                  onClick={() => setActiveModal('products')}
                  className="text-xs font-black text-coffee-600 hover:text-coffee-800 flex items-center gap-2"
                >
                  <List size={14} /> VER CATÁLOGO COMPLETO
                </button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'products' && (
        <Modal title="Catálogo General de Productos" onClose={() => setActiveModal(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(products || []).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 border rounded-xl bg-white shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    <img src={p.imageUrl || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate text-sm">{p.name}</p>
                  <p className="text-xs text-coffee-600 font-bold">${p.sellingPrice}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase font-bold text-gray-400">Stock</p>
                   <p className={`text-sm font-bold ${p.stock <= stockThreshold ? 'text-red-500' : 'text-green-600'}`}>{p.stock}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {activeModal === 'stock' && (
        <Modal title="Control de Alertas de Stock" onClose={() => setActiveModal(null)}>
          <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Settings className="text-amber-600" />
                <p className="text-sm font-bold text-amber-900">Umbral de Alerta</p>
              </div>
              <input 
                type="number" 
                value={stockThreshold} 
                onChange={(e) => setStockThreshold(Number(e.target.value))}
                className="w-20 p-2 border rounded-lg text-center font-bold bg-white"
              />
            </div>
            <div className="space-y-3">
              {lowStockProducts && lowStockProducts.length > 0 ? (
                lowStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-3">
                      <Coffee className="text-red-400" size={20} />
                      <p className="font-bold text-red-900 text-sm">{p.name}</p>
                    </div>
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">{p.stock} un.</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-10">¡Todo al día! No hay stock bajo el umbral.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'topProduct' && (
        <Modal title="Estadísticas de Productos Estrella" onClose={() => setActiveModal(null)}>
          <div className="space-y-8">
            <div className="bg-coffee-50 p-6 rounded-2xl border border-coffee-200">
               <div className="flex items-center gap-2 text-coffee-700 font-bold mb-4 uppercase text-xs tracking-widest">
                  <Award size={16} /> Lo mejor del mes
               </div>
               {topProductStats.month ? (
                 <div className="flex justify-between items-end">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-2xl font-black text-coffee-900 truncate">{topProductStats.month.name}</h4>
                      <p className="text-sm text-coffee-600 font-medium">{topProductStats.month.qty} unidades vendidas este mes</p>
                    </div>
                    <p className="text-xl font-bold text-coffee-800 flex-shrink-0">${(topProductStats.month.total || 0).toLocaleString()}</p>
                 </div>
               ) : <p className="text-gray-400">Sin datos este mes.</p>}
            </div>

            <div className="p-6 rounded-2xl border border-gray-200">
               <div className="flex items-center gap-2 text-gray-500 font-bold mb-4 uppercase text-xs tracking-widest">
                  <ShoppingCart size={16} /> Top Histórico
               </div>
               {topProductStats.allTime ? (
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 min-w-0">
                       <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold flex-shrink-0">#1</div>
                       <div className="min-w-0">
                          <h4 className="text-lg font-bold text-gray-800 truncate">{topProductStats.allTime.name}</h4>
                          <p className="text-xs text-gray-500">{topProductStats.allTime.qty} ventas en total</p>
                       </div>
                    </div>
                    <p className="font-bold text-gray-700 flex-shrink-0">${(topProductStats.allTime.total || 0).toLocaleString()}</p>
                 </div>
               ) : <p className="text-gray-400">Sin historial.</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
