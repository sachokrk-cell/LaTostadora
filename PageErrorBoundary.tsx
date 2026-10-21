import React from 'react';

export default class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Error al abrir una sección:', error); }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
        <h2 className="text-xl font-bold">No pudimos abrir esta sección</h2>
        <p className="mt-2">Recargá la aplicación para volver a intentarlo.</p>
        <button className="mt-4 rounded-xl bg-red-900 px-5 py-3 font-bold text-white" onClick={() => window.location.reload()}>Recargar aplicación</button>
      </div>
    );
    return this.props.children;
  }
}
