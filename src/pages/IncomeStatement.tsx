import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Briefcase, Calendar, Wallet, Clock, Tag, ShoppingCart, Info } from 'lucide-react';

const IncomeStatement = () => {
  const { sales } = useStore();

  const { monthlyData, cashMetrics } = useMemo(() => {
    const data: Record<string, { 
        billed: number, // Facturado (Bruto)
        collected: number, // Realmente Cobrado
        discounts: number, // Facturado - Cobrado
        cogs: number, // CMV
        profit: number, // Cobrado - CMV
        margin: number // Profit / Cobrado
    }> = {};

    let totalBilled = 0;
    let totalCollected = 0;
    let totalDiscounts = 0;
    let totalCogs = 0;

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (isNaN(saleDate.getTime())) return;

      const year = saleDate.getFullYear();
      const month = String(saleDate.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      
      if (!data[key]) {
        data[key] = { billed: 0, collected: 0, discounts: 0, cogs: 0, profit: 0, margin: 0 };
      }

      // 1. Calcular Facturado y CMV desde los items reales
      let saleBilled = 0;
      let saleCogs = 0;

      (sale.items || []).forEach((item: any) => {
         const itemPrice = Number(item.appliedPrice) || 0;
         const itemCost = Number(item.costPrice) || 0;
         const itemQty = Number(item.quantity) || 0;
         
         saleBilled += itemPrice * itemQty;
         saleCogs += itemCost * itemQty;
      });

      // Fallback por si la venta no tiene items detallados
      if (saleBilled === 0 && sale.total) {
          saleBilled = (Number(sale.subtotal) || Number(sale.total) + (Number(sale.discountAmount) || 0));
      }

      // 2. Calcular Realmente Cobrado
      let safePaid = 0;
      if (sale.amount_paid !== undefined && sale.amount_paid !== null) {
          safePaid = Number(sale.amount_paid);
      } else if (sale.amountPaid !== undefined && sale.amountPaid !== null) {
          safePaid = Number(sale.amountPaid);
      } else {
          safePaid = Number(sale.total) || 0; // Fallback a total si no existe el registro de cobro
      }

      // 3. Calcular Descuentos (Regla: Facturado - Cobrado)
      const saleDiscount = saleBilled - safePaid;

      // Sumar a los totales globales
      totalBilled += saleBilled;
      totalCollected += safePaid;
      totalDiscounts += saleDiscount;
      totalCogs += saleCogs;

      // Sumar a los totales del mes
      data[key].billed += saleBilled;
      data[key].collected += safePaid;
      data[key].discounts += saleDiscount;
      data[key].cogs += saleCogs;
    });

    Object.keys(data).forEach(key => {
        // 4. Utilidad Neta (Regla: Cobrado - CMV)
        data[key].profit = data[key].collected - data[key].cogs;
        
        // 5. Margen % (Regla: Utilidad / Cobrado)
        data[key].margin = data[key].collected > 0 ? (data[key].profit / data[key].collected) * 100 : 0;
    });

    const monthlyArray = Object.entries(data)
      .map(([month, stats]) => ({
        month,
        ...stats
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { 
        monthlyData: monthlyArray, 
        cashMetrics: { 
          totalBilled, 
          totalCollected,
          totalDiscounts,
          totalCogs,
          totalProfit: totalCollected - totalCogs // Utilidad global = Cobrado global - CMV global
        }
    };
  }, [sales]);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-white min-h-screen pb-32 text-[#1C1C1C]">
      
      {/* HEADER AL ESTILO LA TOSTADORA */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Resultados <br/><span className="text-[#6B7A3A]">Financieros</span></h2>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] mt-2">Control de Rentabilidad</p>
        </div>
        <div className="bg-gray-50 text-gray-500 px-5 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border-2 border-gray-100 flex items-center gap-2 shadow-sm">
           <Info size={16} className="text-[#6B7A3A]"/> Cobrado - CMV = Utilidad Neta
        </div>
      </div>

      {/* KPI CARDS CON NUEVO DISEÑO */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Facturado */}
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center gap-2 text-gray-400 mb-2">
              <TrendingUp size={16} />
              <h3 className="font-black uppercase tracking-widest text-[9px]">Facturado Total</h3>
           </div>
           <p className="text-3xl font-black tracking-tighter text-[#1C1C1C]">${cashMetrics.totalBilled.toLocaleString()}</p>
        </div>

        {/* Descuentos */}
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Tag size={16} />
              <h3 className="font-black uppercase tracking-widest text-[9px]">Descuentos</h3>
           </div>
           <p className="text-3xl font-black tracking-tighter text-amber-500">-${cashMetrics.totalDiscounts.toLocaleString()}</p>
        </div>
        
        {/* Cobrado */}
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#6B7A3A]/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
           <div className="flex items-center gap-2 text-[#6B7A3A] mb-2 relative z-10">
              <Wallet size={16} />
              <h3 className="font-black uppercase tracking-widest text-[9px]">Realmente Cobrado</h3>
           </div>
           <p className="text-3xl font-black tracking-tighter text-[#6B7A3A] relative z-10">${cashMetrics.totalCollected.toLocaleString()}</p>
           <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#6B7A3A]/5 rounded-full blur-xl"></div>
        </div>

        {/* CMV */}
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-center gap-2 text-red-500 mb-2">
              <ShoppingCart size={16} />
              <h3 className="font-black uppercase tracking-widest text-[9px]">Costo (CMV)</h3>
           </div>
           <p className="text-3xl font-black tracking-tighter text-red-500">-${cashMetrics.totalCogs.toLocaleString()}</p>
        </div>

        {/* UTILIDAD NETA (KPI DESTACADO) */}
        <div className="bg-[#1C1C1C] p-6 rounded-[2.5rem] border-2 border-[#1C1C1C] shadow-2xl lg:col-span-1 flex flex-col justify-center relative overflow-hidden">
           <div className="flex items-center gap-2 text-gray-400 mb-2 relative z-10">
              <DollarSign size={16} />
              <h3 className="font-black uppercase tracking-widest text-[9px]">Utilidad Neta</h3>
           </div>
           <p className="text-4xl font-black italic tracking-tighter text-white relative z-10">
             ${cashMetrics.totalProfit.toLocaleString()}
           </p>
           {/* Efecto de luz de fondo */}
           <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#6B7A3A]/30 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* GRÁFICO AL ESTILO DASHBOARD */}
      <div className="bg-gray-50 p-8 rounded-[3rem] border-2 border-gray-100">
         <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-2 text-[#1C1C1C]">
           Rentabilidad Mensual
         </h3>
         <div className="h-64 md:h-80">
            {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="month" tick={{fill: '#666', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fill: '#666', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1C1C1C', color: '#fff', border: 'none', borderRadius: '1rem' }} itemStyle={{ color: '#fff' }} formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                      <Bar name="Facturado" dataKey="billed" fill="#E5E7EB" radius={[6, 6, 0, 0]} />
                      <Bar name="Cobrado" dataKey="collected" fill="#1C1C1C" radius={[6, 6, 0, 0]} />
                      <Bar name="CMV" dataKey="cogs" fill="#FCA5A5" radius={[6, 6, 0, 0]} />
                      <Bar name="Utilidad Neta" dataKey="profit" fill="#6B7A3A" radius={[6, 6, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400 font-black uppercase tracking-widest text-xs">Sin datos para graficar</div>
            )}
         </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-white rounded-[3rem] shadow-sm overflow-hidden border-2 border-gray-100">
         <div className="p-8 border-b-2 border-gray-100 bg-gray-50">
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#1C1C1C]">
               Desglose Mensual
            </h3>
         </div>
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs text-left whitespace-nowrap">
               <thead className="bg-[#1C1C1C] text-white font-black uppercase tracking-widest text-[10px]">
                  <tr>
                     <th className="p-5 rounded-tl-3xl">Mes</th>
                     <th className="p-5 text-right">1. Facturado ($)</th>
                     <th className="p-5 text-right text-gray-400">2. Descuentos</th>
                     <th className="p-5 text-right text-[#6B7A3A]">3. Cobrado ($)</th>
                     <th className="p-5 text-right">4. Utilidad Neta</th>
                     <th className="p-5 text-right text-red-300">5. CMV (Costo)</th>
                     <th className="p-5 text-center rounded-tr-3xl">6. Margen %</th>
                  </tr>
               </thead>
               <tbody className="divide-y-2 divide-gray-50">
                  {monthlyData.length > 0 ? monthlyData.slice().reverse().map((row) => (
                     <tr key={row.month} className="hover:bg-gray-50 transition-colors group">
                        <td className="p-5 font-black text-[#1C1C1C] uppercase">{row.month}</td>
                        <td className="p-5 text-right text-gray-400 font-bold">${row.billed.toLocaleString()}</td>
                        <td className="p-5 text-right text-amber-500 font-bold">-${row.discounts.toLocaleString()}</td>
                        <td className="p-5 text-right text-[#6B7A3A] font-black text-sm">${row.collected.toLocaleString()}</td>
                        <td className="p-5 text-right text-[#1C1C1C] font-black text-sm">${row.profit.toLocaleString()}</td>
                        <td className="p-5 text-right text-red-400 font-bold">-${row.cogs.toLocaleString()}</td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1.5 rounded-full font-black text-[10px] border ${row.margin > 35 ? 'bg-[#6B7A3A]/10 text-[#6B7A3A] border-[#6B7A3A]/20' : 'bg-gray-100 text-[#1C1C1C] border-gray-200'}`}>
                            {row.margin.toFixed(1)}%
                          </span>
                        </td>
                     </tr>
                  )) : (
                      <tr>
                          <td colSpan={7} className="p-10 text-center text-gray-400 uppercase font-black tracking-widest text-[10px]">No hay ventas registradas</td>
                      </tr>
                  )}
               </tbody>
            </table>
         </div>
         <div className="p-6 bg-gray-50 border-t-2 border-gray-100 text-[9px] text-gray-400 font-black flex flex-wrap gap-4 justify-center uppercase tracking-widest">
            <span>Desc = Facturado - Cobrado</span>
            <span className="text-[#6B7A3A]">Utilidad = Cobrado - CMV</span>
            <span>Margen % = (Utilidad / Cobrado) × 100</span>
         </div>
      </div>
    </div>
  );
};

export default IncomeStatement;
