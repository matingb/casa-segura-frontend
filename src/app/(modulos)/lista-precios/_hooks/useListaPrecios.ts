'use client';

import { useEffect, useMemo, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { apiFetch } from '../../../../lib/apiFetch';

export interface SucursalOption {
  value: string;
  label: string;
}

interface UseListaPreciosResult {
  sucursalId: string;
  setSucursalId: (id: string) => void;
  sucursalOptions: SucursalOption[];
  items: StockItem[];
  isLoading: boolean;
  sucursalNombre: string;
}

interface ApiSucursal {
  id: string;
  nombre: string;
}

export function useListaPrecios(): UseListaPreciosResult {
  const [sucursalId, setSucursalId] = useState('');
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const [sucursales, setSucursales] = useState<ApiSucursal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setIsLoading(true);
      try {
        const [stockData, sucursalesRes] = await Promise.all([
          stockClient.obtenerTodos(),
          apiFetch('/api/sucursales'),
        ]);

        setStockTotal(stockData);

        if (sucursalesRes.ok) {
          const json = await sucursalesRes.json();
          if (json.status === 'success' && Array.isArray(json.data)) {
            setSucursales(json.data);
            // Seleccionar la primera sucursal por defecto
            if (json.data.length > 0 && !sucursalId) {
              setSucursalId(json.data[0].id);
            }
          }
        }
      } catch (err) {
        console.error('[useListaPrecios] Error al cargar datos:', err);
      } finally {
        setIsLoading(false);
      }
    }

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sucursalOptions: SucursalOption[] = useMemo(() => {
    return sucursales.map((s) => ({ value: s.id, label: s.nombre }));
  }, [sucursales]);

  const sucursalNombre = useMemo(() => {
    return sucursales.find((s) => s.id === sucursalId)?.nombre ?? '';
  }, [sucursales, sucursalId]);

  const items = useMemo(() => {
    if (!sucursalId) return [];
    return stockTotal.filter(
      (item) => item.sucursalId === sucursalId && item.activo
    );
  }, [stockTotal, sucursalId]);

  return {
    sucursalId,
    setSucursalId,
    sucursalOptions,
    items,
    isLoading,
    sucursalNombre,
  };
}
