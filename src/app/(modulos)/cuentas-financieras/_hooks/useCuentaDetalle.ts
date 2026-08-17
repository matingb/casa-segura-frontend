import { useCallback, useEffect, useState } from 'react';
import { CuentaFinanciera } from '../../../../lib/types/CuentaFinanciera';
import { MovimientoCuenta } from '../../../../lib/types/MovimientoCuenta';
import { cuentaFinancieraClient } from '../../../../lib/api/cuenta-financiera.client';

interface UseCuentaDetalleResult {
  cuenta: CuentaFinanciera | null;
  movimientos: MovimientoCuenta[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCuentaDetalle(cuentaId: string): UseCuentaDetalleResult {
  const [cuenta, setCuenta] = useState<CuentaFinanciera | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCuenta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!cuentaId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [cuentaData, movimientosData] = await Promise.all([
        cuentaFinancieraClient.obtenerPorId(cuentaId),
        cuentaFinancieraClient.obtenerMovimientos(cuentaId),
      ]);
      setCuenta(cuentaData);
      setMovimientos(movimientosData);
    } catch (err) {
      console.error('[useCuentaDetalle] Error cargando detalle de cuenta:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos de la cuenta');
    } finally {
      setIsLoading(false);
    }
  }, [cuentaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    cuenta,
    movimientos,
    isLoading,
    error,
    reload: fetchData,
  };
}
