import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getBusinessAdvice } from '../services/geminiService';
import { BrainCircuit, Send, Loader2, Sparkles } from 'lucide-react';

const Advisor = () => {
  const storeData = useStore();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    
    // Pass the entire store state (products, sales, etc.) to the service
    const answer = await getBusinessAdvice(storeData, query);
    
    setResponse(answer);
    setLoading(false);
  };

  const suggestions = [
    "¿Cuál es mi producto más rentable?",
    "Dame una estrategia para vender más el próximo mes",
    "Analiza mis ventas y dime qué productos debería promocionar",
    "¿Cómo puedo mejorar la fidelización de mis clientes?"
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white mb-4 shadow-lg">
          <BrainCircuit size={48} />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Asesor de Negocios Inteligente</h2>
        <p className="text-gray-500 mt-2">Impulsado por Gemini AI. Pregunta sobre tus datos, estrategias y más.</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {response ? (
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-4 text-indigo-700 font-bold">
                 <Sparkles size={20} /> Respuesta del Asesor
              </div>
              <div className="prose prose-indigo max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {response}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <p>¿En qué puedo ayudarte hoy?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => setQuery(s)}
                    className="p-3 text-sm border rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleAsk} className="p-4 bg-gray-50 border-t flex gap-2">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe tu pregunta sobre el negocio..."
            className="flex-1 p-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
          <button 
            type="submit" 
            disabled={loading || !query}
            className="bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-bold"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            {loading ? 'Pensando...' : 'Preguntar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Advisor;
