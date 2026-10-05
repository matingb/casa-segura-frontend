'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { cotizacionClient } from '../lib/api/cotizacion.client';
import { Cotizacion } from '../lib/types/Moneda';
interface Valor { datos: Cotizacion | null; error: string | null; revision: number; recargar: () => Promise<Cotizacion | null> }
const Context = createContext<Valor>({ datos: null, error: null, revision: 0, recargar: async () => null });
export function CotizacionProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const recargar = useCallback(async () => {
    const id = ++request.current;
    try {
      const data = await cotizacionClient.obtener();
      if (id === request.current) { setDatos(data); setError(null); setRevision(n => n + 1); }
      return data;
    } catch (err) {
      if (id === request.current) setError(err instanceof Error ? err.message : 'No se pudo actualizar la cotización.');
      return null;
    }
  }, []);
  useEffect(() => {
    const contador = request;
    const refresh = () => { void recargar(); };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('cotizacion-actualizada', refresh);
    return () => { contador.current++; window.removeEventListener('focus', refresh); window.removeEventListener('cotizacion-actualizada', refresh); };
  }, [recargar]);
  return <Context.Provider value={{ datos, error, revision, recargar }}>{children}</Context.Provider>;
}
export const useCotizacion = () => useContext(Context);
