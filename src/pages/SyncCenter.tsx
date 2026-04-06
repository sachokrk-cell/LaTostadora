import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Cloud, Download, Upload, Copy, Check, RefreshCcw, AlertCircle } from 'lucide-react';

const Nube = () => {
  const { syncId, setSyncId, pullFromLegacyCloud, isLoading, refreshData, dataSize } = useStore();
  const [inputValue, setInputValue] = useState(syncId || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(syncId || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMigration = async () => {
    if (!inputValue) return;
    // Esta función va a buscar tus datos de "GWLFLL" y los va a repartir en las nuevas tablas
    await pullFromLegacyCloud(inputValue.toUpperCase().trim());
  };

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8 animate-fade-in text-[#1C1C1C]">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-[#1C1C1C] rounded-[2rem] flex items-center justify-center mx-auto shadow-xl border-b-8 border-[#6B7A3A]">
          <Cloud size={40} className="text-[#E8DFC8]" />
        </div>
        <h2 className="text-4xl font-black uppercase italic tracking-tighter">Nube La Tostadora</h2>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Sincronización Multidispositivo</p>
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-sm p-8 space-y-8 relative overflow-hidden">
        {/* INDICADOR DE ESTADO */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${syncId ? 'bg-[#6B7A3A] animate-pulse' : 'bg-gray-200'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {isLoading ? 'Sincronizando...' : (syncId ? 'Conectado' : 'Sin Vincular')}
            </span>
          </div>
        </div>

        {/* CLAVE DE ACCESO */}
        <div className="text-center space-y-4 py-4">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Tu Clave de Sincronización</p>
          <div className="flex items-center justify-center gap-3">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              placeholder="PEGA TU CLAVE AQUÍ"
              className="text-4xl font-black tracking-[0.2em] text-center bg-gray-50 border-2 border-transparent focus:border-[#6B7A3A] rounded-2xl p-4 w-full outline-none transition-all uppercase"
            />
          </div>
          <p className="text-[10px] font-bold text-red-500 italic">¡Usa la clave que ya tenías (GWLFLL) para recuperar tus datos!</p>
        </div>

        {/* ACCIÓN DE RESCATE */}
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={handleMigration}
            disabled={isLoading || !inputValue}
            className="w-full py-6 bg-[#1C1C1C] text-[#E8DFC8] rounded-[2rem] font-black text-xl uppercase italic shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 border-b-8 border-black disabled:opacity-50"
          >
            {isLoading ? <RefreshCcw className="animate-spin" /> : <Download size={24} />}
            Recuperar y Sincronizar
          </button>
        </div>

        <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100 flex gap-4 items-start">
           <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
           <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase">
             Al presionar recuperar, tus datos antiguos se organizarán automáticamente en el nuevo sistema interactivo. Esto solo se hace una vez por dispositivo.
           </p>
        </div>
      </div>
    </div>
  );
};

export default Nube;
