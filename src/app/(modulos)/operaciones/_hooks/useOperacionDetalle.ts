import { useCallback, useEffect, useState } from 'react';
import { OperacionDetalle } from '../../../../lib/types/OperacionDetalle';
import { operacionesClient } from '../../../../lib/api/operaciones.client';

interface UseOperacionDetalleResult {
  operacion: OperacionDetalle | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useOperacionDetalle(operacionId: string): UseOperacionDetalleResult {
  const [operacion, setOperacion] = useState<OperacionDetalle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!operacionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await operacionesClient.obtenerPorId(operacionId);
      setOperacion(data);
    } catch (err) {
      console.error('[useOperacionDetalle] Error cargando detalle de operación:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar la operación');
    } finally {
      setIsLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    operacion,
    isLoading,
    error,
    reload: fetchData,
  };
}
