import { useCallback, useEffect, useRef, useState } from 'react';
import { Cliente } from '../../../../lib/types/Cliente';
import { clienteClient } from '../../../../lib/api/cliente.client';

interface UseClienteDetalleResult {
  cliente: Cliente | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  clear: (message: string) => void;
}

export function useClienteDetalle(clienteId: string): UseClienteDetalleResult {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const fetchData = useCallback(async () => {
    const version = ++request.current;
    if (!clienteId) {
      setCliente(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setCliente(null);
    setIsLoading(true);
    setError(null);
    try {
      const data = await clienteClient.obtenerPorId(clienteId);
      if (version !== request.current) return;
      setCliente(data);
      if (!data) {
        setError('Cliente no encontrado');
      }
    } catch (err) {
      if (version !== request.current) return;
      console.error('[useClienteDetalle] Error cargando cliente:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el cliente');
    } finally {
      if (version === request.current) setIsLoading(false);
    }
  }, [clienteId]);

  const clear = useCallback((message: string) => {
    request.current += 1;
    setCliente(null);
    setError(message);
    setIsLoading(false);
  }, []);

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
    cliente,
    isLoading,
    error,
    reload: fetchData,
    clear,
  };
}
