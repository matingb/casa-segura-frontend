import { useCallback, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { usePaginatedList } from '../../../../lib/hooks/usePaginatedList';

export type { SucursalOption };

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
  const { sucursalOptions } = useSucursales();

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

