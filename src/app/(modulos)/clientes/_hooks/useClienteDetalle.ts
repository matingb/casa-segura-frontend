import { useCallback, useEffect, useState } from 'react';
import { Cliente } from '../../../../lib/types/Cliente';
import { clienteClient } from '../../../../lib/api/cliente.client';

interface UseClienteDetalleResult {
  cliente: Cliente | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useClienteDetalle(clienteId: string): UseClienteDetalleResult {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!clienteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await clienteClient.obtenerPorId(clienteId);
      setCliente(data);
      if (!data) {
        setError('Cliente no encontrado');
      }
    } catch (err) {
      console.error('[useClienteDetalle] Error cargando cliente:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el cliente');
    } finally {
      setIsLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    cliente,
    isLoading,
    error,
    reload: fetchData,
  };
}
