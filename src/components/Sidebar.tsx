import React, { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Coffee, Users, ShoppingCart, BrainCircuit, 
  Download, Upload, Trash, X, PieChart, Lock, Unlock, 
  ReceiptText, BarChart3, RefreshCw 
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { exportData, importData, resetData, isSaveLocked, toggleSaveLock, pushToCloud, isSyncing } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/pos', icon: ShoppingCart, label: 'Punto de Venta' },
    { path: '/sales', icon: ReceiptText, label: 'Historial Ventas' },
    { path: '/inventory', icon: Coffee, label: 'Inventario' },
    { path: '/clients', icon: Users, label: 'Clientes' },
    { path: '/financials', icon: PieChart, label: 'Resultados' },
    { path: '/analysis', icon: BarChart3, label: 'Análisis' },
    { path: '/advisor', icon: BrainCircuit, label: 'Asesor IA' },
    { path: '/sync', icon: RefreshCw, label: 'Nube' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        importData(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      {/* Overlay para móviles */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-0
      `}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-2">
              <Coffee className="text-amber-400" size={28} />
              <span className="text-xl font-bold tracking-tight">La Tostadora</span>
            </div>
            <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                  ${isActive(item.path) 
                    ? 'bg-amber-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
             <button 
              onClick={toggleSaveLock}
              className={`flex items-center gap-2 text-xs w-full p-2 rounded font-bold transition-all ${
                isSaveLocked ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
              }`}
            >
              {isSaveLocked ? <Lock size={14} /> : <Unlock size={14} />}
              <span>{isSaveLocked ? 'MODO SEGURO (ON)' : 'Guardado Activo'}</span>
            </button>

            <button onClick={exportData} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full p-2 rounded hover:bg-slate-800 transition-colors">
              <Download size={16} />
              <span>Backup Local</span>
            </button>

            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full p-2 rounded hover:bg-slate-800 transition-colors">
              <Upload size={16} />
              <span>Restaurar Backup</span>
            </button>
            
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
            
            <button onClick={resetData} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 w-full p-2 rounded hover:bg-red-900/20 transition-colors mt-2">
              <Trash size={16} />
              <span>Borrar Todo</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
