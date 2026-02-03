
import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Briefcase, Calendar, Wallet, Clock, Tag } from 'lucide-react';

const IncomeStatement = () => {
  const { sales } = useStore();

  const { monthlyData, cashMetrics } = useMemo(() => {
    const data: Record<string, { 
        billed: number, // Subtotal (Bruto)
        discounts: number, // Descuentos aplicados
        cogs: number, // Costo mercadería
        profit: number, 
        itemsSold: number, 
        ticketCount: number,
        pendingMonth: number
    }> = {};

    let totalBilled = 0;
    let totalDiscounts = 0;
    let totalPending = 0;
    let totalCogs = 0;

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (isNaN(saleDate.getTime())) return;

      const year = saleDate.getFullYear();
      const month = String(saleDate.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      
      if (!data[key]) {
        data[key] = { billed: 0, discounts: 0, cogs: 0, profit: 0, itemsSold: 0, ticketCount: 0, pendingMonth: 0 };
      }

      const safeSubtotal = Number(sale.subtotal) || Number(sale.total) + (Number(sale.discountAmount) || 0);
      const safeDiscount = Number(sale.discountAmount) || 0;
      const safeBalance = Number(sale.balance) || 0;

      totalBilled += safeSubtotal;
      totalDiscounts += safeDiscount;
      totalPending += safeBalance;

      data[key].billed += safeSubtotal;
      data[key].discounts += safeDiscount;
      data[key].pendingMonth += safeBalance;
      data[key].ticketCount += 1;

      (sale.items || []).forEach(item => {
         const itemCost = Number(item.costPrice) || 0;
         const itemQty = Number(item.quantity) || 0;
         const costLine = itemCost * itemQty;
         data[key].itemsSold += itemQty;
         data[key].cogs += costLine;
         totalCogs += costLine;
      });
    });

    Object.keys(data).forEach(key => {
        // Utilidad = Facturado - Descuentos - Costo
        data[key].profit = data[key].billed - data[key].discounts - data[key].cogs;
    });

    const monthlyArray = Object.entries(data)
      .map(([month, stats]) => ({
        month,
        ...stats,
        // Cobrado = (Facturado - Descuentos) - Pendiente
        collectedMonth: (stats.billed - stats.discounts) - stats.pendingMonth,
        margin: stats.billed > 0 ? (stats.profit / (stats.billed - stats.discounts)) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { 
        monthlyData: monthlyArray, 
        cashMetrics: { 
          totalBilled, 
          totalDiscounts,
          totalPending, 
          totalCogs,
          totalProfit: totalBilled - totalDiscounts - totalCogs,
          totalCollected: (totalBilled - totalDiscounts) - totalPending 
        }
    };
  }, [sales]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-coffee-900">Resultados Generales</h2>
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-blue-200 shadow-sm">
           Metodología: Facturado - Descuentos - CMV = Utilidad
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* FACTURACIÓN BRUTA */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
           <div className="flex items-center gap-2 text-gray-500 mb-2">
              <TrendingUp size={18} />
              <h3 className="font-black uppercase tracking-wider text-[10px]">Facturado (Bruto)</h3>
           </div>
           <p className="text-xl font-black text-gray-800">${cashMetrics.totalBilled.toLocaleString()}</p>
        </div>

        {/* DESCUENTOS */}
        <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 shadow-sm">
           <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Tag size={18} />
              <h3 className="font-black uppercase tracking-wider text-[10px]">Descuentos Totales</h3>
           </div>
           <p className="text-xl font-black text-amber-700">-${cashMetrics.totalDiscounts.toLocaleString()}</p>
        </div>
        
        {/* INGRESOS COBRADOS */}
        <div className="bg-green-50 p-5 rounded-3xl border border-green-100 shadow-md">
           <div className="flex items-center gap-2 text-green-700 mb-2">
              <Wallet size={18} />
              <h3 className="font-black uppercase tracking-wider text-[10px]">Ingresos Cobrados</h3>
           </div>
           <p className="text-xl font-black text-green-900">${cashMetrics.totalCollected.toLocaleString()}</p>
        </div>

        {/* PENDIENTE DE COBRO */}
        <div className="bg-red-50 p-5 rounded-3xl border border-red-100 shadow-sm">
           <div className="flex items-center gap-2 text-red-600 mb-2">
              <Clock size={18} />
              <h3 className="font-black uppercase tracking-wider text-[10px]">Pendiente Cobro</h3>
           </div>
           <p className="text-xl font-black text-red-900">${cashMetrics.totalPending.toLocaleString()}</p>
        </div>

        {/* UTILIDAD NETA (KPI DESTACADO) */}
        <div className="bg-blue-600 p-5 rounded-3xl border border-blue-700 shadow-xl lg:col-span-1">
           <div className="flex items-center gap-2 text-blue-100 mb-2">
              <DollarSign size={18} />
              <h3 className="font-black uppercase tracking-wider text-[10px]">Utilidad Neta</h3>
           </div>
           <p className="text-2xl font-black text-white">
             ${cashMetrics.totalProfit.toLocaleString()}
           </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
         <h3 className="font-black text-lg mb-6 text-coffee-800 flex items-center gap-2">
           <Briefcase size={20} /> Rentabilidad Mensual
         </h3>
         <div className="h-64 md:h-80">
            {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{fontSize: 12, fontWeight: 'bold'}} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip cursor={{fill: '#f9fafb'}} formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Bar name="Facturado" dataKey="billed" fill="#d2bab0" radius={[6, 6, 0, 0]} />
                      <Bar name="Descuentos" dataKey="discounts" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      <Bar name="Costo CMV" dataKey="cogs" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      <Bar name="Utilidad" dataKey="profit" fill="#2563eb" radius={[6, 6, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase tracking-widest text-sm">Sin datos para graficar</div>
            )}
         </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
         <div className="p-6 border-b bg-gray-50">
            <h3 className="font-black text-coffee-900 flex items-center gap-2 uppercase tracking-widest text-sm">
              <Calendar size={18} /> Detalle Financiero Mensual
            </h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
               <thead className="bg-coffee-900 text-white font-black uppercase tracking-tighter">
                  <tr>
                     <th className="p-5">Mes</th>
                     <th className="p-5 text-right">Facturado ($)</th>
                     <th className="p-5 text-right text-amber-200">Descuentos</th>
                     <th className="p-5 text-right">Cobrado ($)</th>
                     <th className="p-5 text-right text-blue-200">Utilidad Neta</th>
                     <th className="p-5 text-right text-red-200">CMV (Costo)</th>
                     <th className="p-5 text-center">Margen %</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {monthlyData.length > 0 ? monthlyData.slice().reverse().map((row) => (
                     <tr key={row.month} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5 font-black text-gray-700 uppercase">{row.month}</td>
                        <td className="p-5 text-right text-gray-400 font-bold">${row.billed.toLocaleString()}</td>
                        <td className="p-5 text-right text-amber-600 font-bold">-${row.discounts.toLocaleString()}</td>
                        <td className="p-5 text-right text-green-700 font-bold">${row.collectedMonth.toLocaleString()}</td>
                        <td className="p-5 text-right text-blue-700 font-black">${row.profit.toLocaleString()}</td>
                        <td className="p-5 text-right text-red-500 font-medium">${row.cogs.toLocaleString()}</td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1 rounded-full font-black text-[10px] ${row.margin > 35 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                            {row.margin.toFixed(1)}%
                          </span>
                        </td>
                     </tr>
                  )) : (
                      <tr>
                          <td colSpan={7} className="p-10 text-center text-gray-400 uppercase font-black tracking-widest">No hay ventas registradas</td>
                      </tr>
                  )}
               </tbody>
            </table>
         </div>
         <div className="p-4 bg-gray-50 text-[10px] text-gray-500 font-bold flex gap-4 justify-center uppercase tracking-widest">
            <span>Facturado = Suma Subtotales</span>
            <span>Utilidad = Facturado - Descuentos - CMV</span>
            <span>Margen % = Utilidad / (Facturado - Descuentos)</span>
         </div>
      </div>
    </div>
  );
};

export default IncomeStatement;
