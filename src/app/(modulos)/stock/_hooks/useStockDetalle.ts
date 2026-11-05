import { useCallback, useEffect, useRef, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';

interface UseStockDetalleResult {
  stockItem: StockItem | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useStockDetalle(stockItemId: string): UseStockDetalleResult {
  const [stockItem, setStockItem] = useState<StockItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const fetchData = useCallback(async () => {
    const version = ++request.current;
    if (!stockItemId) {
      setStockItem(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setStockItem(null);
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockClient.obtenerPorId(stockItemId);
      if (version !== request.current) return;
      setStockItem(data);
      if (!data) {
        setError('Stock no encontrado');
      }
    } catch (err) {
      if (version !== request.current) return;
      console.error('[useStockDetalle] Error cargando stock:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el stock');
    } finally {
      if (version === request.current) setIsLoading(false);
    }
  }, [stockItemId]);

  useEffect(() => {
    void fetchData();
    const revalidarAlRevocar = () => { void fetchData(); };
    window.addEventListener('alcance-pdv-revocado', revalidarAlRevocar);
    return () => {
      request.current += 1;
      window.removeEventListener('alcance-pdv-revocado', revalidarAlRevocar);
    };
  }, [fetchData]);

  return {
    stockItem,
    isLoading,
    error,
    reload: fetchData,
  };
}
