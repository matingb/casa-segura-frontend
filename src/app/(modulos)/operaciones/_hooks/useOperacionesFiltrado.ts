import { useCallback, useMemo, useState } from 'react';
import { Operacion } from '../../../../lib/types/Operacion';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { usePaginatedList } from '../../../../lib/hooks/usePaginatedList';

export type { SucursalOption };

export interface TipoOption {
  value: string;
  label: string;
}

interface UseOperacionesFiltradoResult {
  operaciones: Operacion[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  sucursalId: string;
  setSucursalId: (v: string) => void;
  tipoId: string;
  setTipoId: (v: string) => void;
  sucursalOptions: SucursalOption[];
  tipoOptions: TipoOption[];
  totalMonto: number;
}

export function useOperacionesFiltrado(): UseOperacionesFiltradoResult {
  const [sucursalId, setSucursalId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const { sucursalOptions } = useSucursales();

  const fetcher = useCallback(
    (params: { limit: number; offset: number }) =>
      operacionesClient.obtenerPaginado({
        ...params,
        sucursalId: sucursalId || undefined,
      }),
    [sucursalId]
  );

  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedList<Operacion>({
    fetcher,
    extraParams: { sucursalId },
  });

  const tipoOptions: TipoOption[] = useMemo(() => {
    const unique = new Map<string, string>();
    items.forEach((op) => {
      if (op.tipoId && !unique.has(op.tipoId)) {
        unique.set(op.tipoId, op.tipoNombre || op.tipoId);
      }
    });
    return [
      { value: '', label: 'Todos los tipos' },
      ...Array.from(unique.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [items]);

  const operacionesFiltradas = useMemo(() => {
    if (!tipoId) return items;
    return items.filter((op) => op.tipoId === tipoId);
  }, [tipoId, items]);

  const totalMonto = useMemo(
    () => operacionesFiltradas.reduce((acc, op) => acc + op.monto, 0),
    [operacionesFiltradas]
  );

  return {
    operaciones: operacionesFiltradas,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    sucursalId,
    setSucursalId,
    tipoId,
    setTipoId,
    sucursalOptions,
    tipoOptions,
    totalMonto,
  };
}
