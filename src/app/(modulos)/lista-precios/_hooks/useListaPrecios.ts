'use client';

import { useEffect, useMemo, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';

export type { SucursalOption };

interface UseListaPreciosResult {
  sucursalId: string;
  setSucursalId: (id: string) => void;
  sucursalOptions: SucursalOption[];
  items: StockItem[];
  isLoading: boolean;
  sucursalNombre: string;
}

export function useListaPrecios(): UseListaPreciosResult {
  const [sucursalId, setSucursalId] = useState('');
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const { sucursales } = useSucursales();
  const [isLoading, setIsLoading] = useState(true);

  // Seleccionar la primera sucursal por defecto cuando estén disponibles
  useEffect(() => {
    if (sucursales.length > 0 && !sucursalId) {
      setSucursalId(sucursales[0].id);
    }
  }, [sucursales, sucursalId]);

  useEffect(() => {
    async function cargar() {
      setIsLoading(true);
      try {
        const stockData = await stockClient.obtenerTodos();
        setStockTotal(stockData);
      } catch (err) {
        console.error('[useListaPrecios] Error al cargar datos:', err);
      } finally {
        setIsLoading(false);
      }
    }

    cargar();
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
