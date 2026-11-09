'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Sucursal, sucursalClient } from '../lib/api/sucursal.client';
import { getGlobalStaleTimeMs } from '../lib/config/staleTime';

export interface SucursalOption {
  value: string;
  label: string;
}

export const SUCURSALES_STALE_TIME_MS = getGlobalStaleTimeMs();

interface SucursalContextType {
  sucursales: Sucursal[];
  sucursalOptions: SucursalOption[];
  isLoading: boolean;
  error: string | null;
  recargarSucursales: () => Promise<void>;
}

const SucursalContext = createContext<SucursalContextType | undefined>(undefined);

export const SucursalProvider = ({ children }: { children: ReactNode }) => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const sucursalesRef = useRef<Sucursal[]>([]);
  sucursalesRef.current = sucursales;
  const ultimaConsultaRef = useRef(0);

  const cargarSucursales = useCallback(async () => {
    const version = ++requestVersion.current;
    ultimaConsultaRef.current = Date.now();
    if (sucursalesRef.current.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await sucursalClient.obtenerTodas();
      if (version !== requestVersion.current) return;
      setSucursales((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
    } catch (err: unknown) {
      if (version !== requestVersion.current) return;
      console.error('[SucursalProvider] Error cargando sucursales:', err);
      const msg = err instanceof Error ? err.message : 'Error al cargar sucursales';
      if (sucursalesRef.current.length === 0) {
        setSucursales([]);
      }
      setError(msg);
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarSucursales();

    const onFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - ultimaConsultaRef.current < getGlobalStaleTimeMs()) return;
      void cargarSucursales();
    };

    const onAlcanceRevocado = () => {
      void cargarSucursales();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('alcance-pdv-revocado', onAlcanceRevocado);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('alcance-pdv-revocado', onAlcanceRevocado);
    };
  }, [cargarSucursales]);

  const sucursalOptions: SucursalOption[] = useMemo(() => {
    return [
      { value: '', label: 'Todas las sucursales' },
      ...sucursales.map((s) => ({ value: s.id, label: s.nombre })),
    ];
  }, [sucursales]);

  return (
    <SucursalContext.Provider
      value={{
        sucursales,
        sucursalOptions,
        isLoading,
        error,
        recargarSucursales: cargarSucursales,
      }}
    >
      {children}
    </SucursalContext.Provider>
  );
};

export const useSucursales = (): SucursalContextType => {
  const context = useContext(SucursalContext);
  if (!context) {
    throw new Error('useSucursales debe ser utilizado dentro de un SucursalProvider');
  }
  return context;
};
