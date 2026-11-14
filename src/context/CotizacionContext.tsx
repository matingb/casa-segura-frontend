'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { cotizacionClient } from '../lib/api/cotizacion.client';
import { Cotizacion, cotizacionCambio } from '../lib/types/Moneda';
import { getGlobalStaleTimeMs } from '../lib/config/staleTime';

export const COTIZACION_STALE_TIME_MS = getGlobalStaleTimeMs();

interface Valor {
  datos: Cotizacion | null;
  error: string | null;
  revision: number;
  recargar: () => Promise<Cotizacion | null>;
}

const Context = createContext<Valor>({
  datos: null,
  error: null,
  revision: 0,
  recargar: async () => null,
});

export function CotizacionProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const ultimaRef = useRef<Cotizacion | null>(null);
  const ultimaConsultaRef = useRef(0);

  const recargar = useCallback(async () => {
    const id = ++request.current;
    ultimaConsultaRef.current = Date.now();
    try {
      const data = await cotizacionClient.obtener();
      if (id === request.current) {
        const previa = ultimaRef.current;
        ultimaRef.current = data;
        setDatos(data);
        setError(null);
        // Solo incrementar revisión si no es la primera carga y el valor de cotización realmente varió
        if (previa !== null && cotizacionCambio(previa, data)) {
          setRevision((n) => n + 1);
        }
      }
      return data;
    } catch (err) {
      if (id === request.current) {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar la cotización.');
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const contador = request;
    void recargar();
    ultimaConsultaRef.current = Date.now();

    const onFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - ultimaConsultaRef.current < getGlobalStaleTimeMs()) return;
      ultimaConsultaRef.current = Date.now();
      void recargar();
    };

    const onCotizacionActualizada = (event?: Event) => {
      const detalle = (event as CustomEvent<{ alcance?: string }> | undefined)?.detail;
      if (detalle?.alcance === 'SUCURSAL') return;
      ultimaConsultaRef.current = Date.now();
      void recargar();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('cotizacion-actualizada', onCotizacionActualizada);

    return () => {
      contador.current++;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('cotizacion-actualizada', onCotizacionActualizada);
    };
  }, [recargar]);

  return <Context.Provider value={{ datos, error, revision, recargar }}>{children}</Context.Provider>;
}

export const useCotizacion = () => useContext(Context);
