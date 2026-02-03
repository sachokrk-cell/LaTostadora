
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Cloud, CloudUpload, CloudDownload, Copy, Check, RefreshCw, Zap, Key, Info, AlertCircle, ShieldCheck } from 'lucide-react';

const SyncCenter = () => {
  const { syncId, setSyncId, pushToCloud, pullFromCloud, createSyncSession, isSyncing, syncStatus, lastSync, dataSize } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateNew = async () => {
    setError(null);
    const newId = await createSyncSession();
    if (!newId) {
      setError("No se pudo conectar con el servidor de la nube. Revisa tu conexión.");
    }
  };

  const handleConnectExisting = async () => {
    if (inputValue.length < 5) {
      setError("La clave debe tener al menos 5 caracteres.");
      return;
    }
    setError(null);
    const success = await setSyncId(inputValue.trim().toLowerCase());
    if (!success) {
      setError("Clave no encontrada o error al descargar datos.");
    }
  };

  const copyId = () => {
    if (!syncId) return;
    navigator.clipboard.writeText(syncId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 animate-fade-in pb-24">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 bg-coffee-800 rounded-3xl text-white shadow-xl mb-2">
          <Cloud size={48} className={isSyncing ? 'animate-pulse' : ''} />
        </div>
        <h2 className="text-4xl font-black text-coffee-900 tracking-tighter">Nube La Tostadora</h2>
        <p className="text-gray-500">Tus datos seguros y sincronizados entre PC y Celular.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-shake">
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {!syncId ? (
        <div className="space-y-6">
           {/* Crear Sesión */}
           <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                <Zap size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Activar mi Nube</h3>
                <p className="text-sm text-gray-500 mt-1">Si es tu primera vez usando la sincronización, genera una clave aquí.</p>
              </div>
              <button 
                onClick={handleCreateNew}
                disabled={isSyncing}
                className="w-full bg-coffee-800 text-white py-4 rounded-2xl font-black hover:bg-coffee-900 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw className="animate-spin" /> : <ShieldCheck size={18} />}
                EMPEZAR A USAR LA NUBE
              </button>
           </div>

           {/* Conectar Existente */}
           <div className="bg-gray-100 p-8 rounded-[2rem] border border-gray-200 flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Key size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Ya tengo una Clave</h3>
                <p className="text-sm text-gray-500 mt-1">Escribe la clave que generaste en tu otro dispositivo.</p>
              </div>
              <div className="w-full space-y-3">
                 <input 
                   type="text" 
                   placeholder="Ej: 7a8b9c..."
                   className="w-full bg-white border border-gray-200 p-4 rounded-xl text-center font-bold text-coffee-900 focus:ring-2 focus:ring-coffee-500 outline-none"
                   value={inputValue}
                   onChange={e => setInputValue(e.target.value)}
                 />
                 <button 
                   onClick={handleConnectExisting}
                   disabled={isSyncing || !inputValue}
                   className="w-full bg-gray-800 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                 >
                   VINCULAR ESTE DISPOSITIVO
                 </button>
              </div>
           </div>
        </div>
      ) : (
        <div className="space-y-6 animate-scale-up">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
             <div className="p-8 space-y-8">
                {/* Status Bar */}
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${syncStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500 animate-pulse'}`}></div>
                      <span className="text-xs font-black uppercase text-gray-400 tracking-widest">
                        {syncStatus === 'connected' ? 'Sesión Activa' : 'Sincronizando...'}
                      </span>
                   </div>
                   <span className="text-[10px] font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-500">
                      PESO: {dataSize}
                   </span>
                </div>

                {/* Key Display */}
                <div className="bg-gray-50 p-6 rounded-3xl flex flex-col items-center space-y-3 border border-gray-100">
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tu Clave Privada de Sincronización</p>
                   <div className="flex items-center gap-4">
                      <h4 className="text-4xl font-black text-coffee-900 tracking-tighter uppercase select-all">{syncId}</h4>
                      <button onClick={copyId} className="p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95">
                         {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="text-coffee-600" />}
                      </button>
                   </div>
                   <p className="text-[10px] text-amber-600 font-bold">¡No compartas esta clave con nadie!</p>
                </div>

                {/* Main Actions */}
                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => pushToCloud()}
                     disabled={isSyncing}
                     className="flex flex-col items-center gap-2 p-6 bg-coffee-800 text-white rounded-[2rem] hover:bg-coffee-900 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                   >
                      <CloudUpload size={32} />
                      <span className="font-bold text-sm">Subir a Nube</span>
                   </button>
                   <button 
                     onClick={() => pullFromCloud()}
                     disabled={isSyncing}
                     className="flex flex-col items-center gap-2 p-6 bg-white border-2 border-coffee-800 text-coffee-800 rounded-[2rem] hover:bg-coffee-50 transition-all active:scale-95 disabled:opacity-50 shadow-md"
                   >
                      <CloudDownload size={32} />
                      <span className="font-bold text-sm">Bajar de Nube</span>
                   </button>
                </div>

                <div className="text-center pt-4 border-t border-gray-50">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                    Último cambio: {lastSync ? new Date(lastSync).toLocaleString() : 'Nunca'}
                  </p>
                </div>
             </div>
          </div>
          
          <button 
            onClick={() => { if(confirm("¿Quieres desvincular la nube? Tus datos locales se mantendrán.")) setSyncId(undefined); }}
            className="w-full text-red-400 text-xs font-bold hover:underline py-2"
          >
            Cerrar Sesión de Nube
          </button>
        </div>
      )}

      <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex items-start gap-4">
         <Info className="text-amber-600 flex-shrink-0 mt-1" size={24} />
         <div className="space-y-1">
            <h5 className="font-bold text-amber-900 text-sm">¿Cómo no perder mis datos?</h5>
            <ol className="text-xs text-amber-800 leading-relaxed space-y-2 list-decimal ml-4">
              <li><b>Guardado Automático:</b> Tus datos se guardan en este dispositivo automáticamente cada vez que haces un cambio.</li>
              <li><b>Cambio de Dispositivo:</b> Si vas a pasar de la PC al Celular, presiona <b>Subir a Nube</b> en la PC y luego <b>Bajar de Nube</b> en el Celular.</li>
              <li><b>Clave Permanente:</b> Una vez que pongas tu clave, la app la recordará siempre, incluso si cierras la pestaña o reinicias el equipo.</li>
            </ol>
         </div>
      </div>
    </div>
  );
};

export default SyncCenter;
