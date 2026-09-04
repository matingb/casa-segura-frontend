'use client';

import { useEffect, useMemo, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useTableQuery } from '../../../../lib/hooks/useTableQuery';

export type { SucursalOption };

const PAGE_SIZE = 10;
const FILTER_FIELDS = ['marca', 'modelo', 'subtipo'] as const;

function getValor(item: StockItem, key: string, getSubtipoNombre: (id: string) => string): string | number {
  if (key === 'subtipo') return getSubtipoNombre(item.subtipoId);
  if (key === 'precioArs') return item.precioVentaArs;
  if (key === 'precioUsd') return item.precioVentaUsd;
  return (item as any)[key] ?? '';
}

export function useListaPrecios() {
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const { sucursales } = useSucursales();
  const [isLoading, setIsLoading] = useState(true);

  const query = useTableQuery();
  const { getSubtipoNombre } = useClasificacion();

  const sucursalId = query.filters.sucursal ?? '';

  useEffect(() => {
    if (sucursales.length > 0 && !sucursalId) {
      query.setFilters((prev) => ({ ...prev, sucursal: sucursales[0].id }));
    }
  }, [sucursales, sucursalId, query.setFilters]);

  useEffect(() => {
    setIsLoading(true);
    stockClient
      .obtenerTodos()
      .then(setStockTotal)
      .catch((err) => console.error('[useListaPrecios] Error al cargar datos:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const sucursalOptions: SucursalOption[] = useMemo(
    () => sucursales.map((s) => ({ value: s.id, label: s.nombre })),
    [sucursales]
  );

  const sucursalNombre = useMemo(
    () => sucursales.find((s) => s.id === sucursalId)?.nombre ?? '',
    [sucursales, sucursalId]
  );

  const itemsSucursal = useMemo(() => {
    if (!sucursalId) return [];
    return stockTotal.filter((item) => item.sucursalId === sucursalId && item.activo);
  }, [stockTotal, sucursalId]);

  const filterOptions = useMemo(() => {
    const options: Record<string, { value: string; label: string }[]> = { sucursal: sucursalOptions };
    FILTER_FIELDS.forEach((campo) => {
      const valores = Array.from(
        new Set(itemsSucursal.map((item) => String(getValor(item, campo, getSubtipoNombre) ?? '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));
      options[campo] = valores.map((v) => ({ value: v, label: v }));
    });
    return options;
  }, [itemsSucursal, getSubtipoNombre, sucursalOptions]);

  const itemsFiltrados = useMemo(() => {
    const searchLower = query.search.trim().toLowerCase();

    return itemsSucursal.filter((item) => {
      if (searchLower) {
        const matchesCodigo = item.codigo?.toLowerCase().includes(searchLower);
        const matchesNombre = item.nombre?.toLowerCase().includes(searchLower);
        if (!matchesCodigo && !matchesNombre) return false;
      }
      for (const campo of FILTER_FIELDS) {
        const filtro = query.filters[campo];
        if (filtro && String(getValor(item, campo, getSubtipoNombre)) !== filtro) return false;
      }
      return true;
    });
  }, [itemsSucursal, query.filters, query.search, getSubtipoNombre]);

  const items = useMemo(() => {
    if (query.sort.length === 0) return itemsFiltrados;
    return [...itemsFiltrados].sort((a, b) => {
      for (const { sortBy, sortDir } of query.sort) {
        const va = getValor(a, sortBy, getSubtipoNombre);
        const vb = getValor(b, sortBy, getSubtipoNombre);
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [itemsFiltrados, query.sort, getSubtipoNombre]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (query.page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, query.page]);

  return {
    sucursalId,
    sucursalOptions,
    items,
    pageItems,
    ...query,
    page: Math.min(query.page, totalPages),
    totalPages,
    isLoading,
    sucursalNombre,
    filterOptions,
  };
}
