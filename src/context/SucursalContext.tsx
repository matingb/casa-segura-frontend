'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
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

  const cargarSucursales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sucursalClient.obtenerTodas();
      setSucursales(data);
    } catch (err: unknown) {
      console.error('[SucursalProvider] Error cargando sucursales:', err);
      const msg = err instanceof Error ? err.message : 'Error al cargar sucursales';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSucursales();
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
