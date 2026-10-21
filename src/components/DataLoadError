import React from 'react';

export default function DataLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="m-4 rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-red-900">
      <h2 className="text-xl font-bold">No se pudo cargar la información</h2>
      <p className="mt-2">Los datos no están disponibles en este momento. No se mostrarán totales incompletos.</p>
      <p className="mt-3 break-words text-sm">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-red-900 px-5 py-3 font-bold text-white">
        Reintentar carga
      </button>
    </div>
  );
}
