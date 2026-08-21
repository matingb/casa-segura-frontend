import { useCallback, useEffect, useState } from 'react';
import { CuentaFinanciera } from '../../../../lib/types/CuentaFinanciera';
import { cuentaFinancieraClient } from '../../../../lib/api/cuenta-financiera.client';

interface UseCuentaFinancieraDetalleResult {
  cuenta: CuentaFinanciera | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCuentaFinancieraDetalle(cuentaId: string): UseCuentaFinancieraDetalleResult {
  const [cuenta, setCuenta] = useState<CuentaFinanciera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!cuentaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await cuentaFinancieraClient.obtenerPorId(cuentaId);
      setCuenta(data);
      if (!data) {
        setError('Cuenta financiera no encontrada');
      }
    } catch (err) {
      console.error('[useCuentaFinancieraDetalle] Error cargando cuenta:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar la cuenta');
    } finally {
      setIsLoading(false);
    }
  }, [cuentaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { cuenta, isLoading, error, reload: fetchData };
}
