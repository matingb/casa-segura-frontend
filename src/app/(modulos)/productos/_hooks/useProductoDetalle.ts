import { useCallback, useEffect, useState } from 'react';
import { Producto } from '../../../../lib/types/Producto';
import { productoClient } from '../../../../lib/api/producto.client';

interface UseProductoDetalleResult {
  producto: Producto | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useProductoDetalle(productoId: string): UseProductoDetalleResult {
  const [producto, setProducto] = useState<Producto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!productoId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await productoClient.obtenerPorId(productoId);
      setProducto(data);
      if (!data) {
        setError('Producto no encontrado');
      }
    } catch (err) {
      console.error('[useProductoDetalle] Error cargando producto:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el producto');
    } finally {
      setIsLoading(false);
    }
  }, [productoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    producto,
    isLoading,
    error,
    reload: fetchData,
  };
}
