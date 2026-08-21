import { useCallback, useEffect, useState } from 'react';
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

  const fetchData = useCallback(async () => {
    if (!stockItemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockClient.obtenerPorId(stockItemId);
      setStockItem(data);
      if (!data) {
        setError('Stock no encontrado');
      }
    } catch (err) {
      console.error('[useStockDetalle] Error cargando stock:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el stock');
    } finally {
      setIsLoading(false);
    }
  }, [stockItemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stockItem,
    isLoading,
    error,
    reload: fetchData,
  };
}
