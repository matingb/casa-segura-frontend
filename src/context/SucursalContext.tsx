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

export interface SucursalOption {
  value: string;
  label: string;
}

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

  const cargarSucursales = useCallback(async () => {
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    setSucursales([]);
    try {
      const data = await sucursalClient.obtenerTodas();
      if (version !== requestVersion.current) return;
      setSucursales(data);
    } catch (err: unknown) {
      if (version !== requestVersion.current) return;
      console.error('[SucursalProvider] Error cargando sucursales:', err);
      const msg = err instanceof Error ? err.message : 'Error al cargar sucursales';
      setSucursales([]);
      setError(msg);
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarSucursales();
    const recargarAlVolver = () => { void cargarSucursales(); };
    window.addEventListener('focus', recargarAlVolver);
    window.addEventListener('alcance-pdv-revocado', recargarAlVolver);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener('focus', recargarAlVolver);
      window.removeEventListener('alcance-pdv-revocado', recargarAlVolver);
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
