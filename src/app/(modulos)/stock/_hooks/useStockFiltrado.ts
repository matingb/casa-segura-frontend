import { useCallback, useEffect, useMemo, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { sucursalClient, Sucursal } from '../../../../lib/api/sucursal.client';
import { usePaginatedList } from '../../../../lib/hooks/usePaginatedList';

export interface SucursalOption {
  value: string; // '' para "Todas"
  label: string;
}

interface UseStockFiltradoResult {
  search: string;
  setSearch: (valor: string) => void;
  sucursalId: string;
  setSucursalId: (id: string) => void;
  sucursalOptions: SucursalOption[];
  stock: StockItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

export function useStockFiltrado(): UseStockFiltradoResult {
  const [sucursalId, setSucursalId] = useState('');
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);

  useEffect(() => {
    sucursalClient
      .obtenerTodas()
      .then(setSucursales)
      .catch((err) => console.error('[useStockFiltrado] Error al cargar sucursales:', err));
  }, []);

  const sucursalOptions: SucursalOption[] = useMemo(() => {
    return [
      { value: '', label: 'Todas las sucursales' },
      ...sucursales.map((s) => ({ value: s.id, label: s.nombre })),
    ];
  }, [sucursales]);

  const fetcher = useCallback(
    (params: { limit: number; offset: number; search?: string }) =>
      stockClient.obtenerPaginado({
        ...params,
        sucursalId: sucursalId || undefined,
      }),
    [sucursalId]
  );

  const { items, search, setSearch, loading, loadingMore, hasMore, loadMore } = usePaginatedList<StockItem>({
    fetcher,
    extraParams: { sucursalId },
  });

  return {
    search,
    setSearch,
    sucursalId,
    setSucursalId,
    sucursalOptions,
    stock: items,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
