'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useTableQuery } from '../../../../lib/hooks/useTableQuery';

import { useCotizacion } from '../../../../context/CotizacionContext';
export type { SucursalOption };

const PAGE_SIZE = 10;
const FILTER_FIELDS = ['marca', 'modelo', 'subtipo'] as const;

function getValor(item: StockItem, key: string, getSubtipoNombre: (id: string) => string): string | number | null {
  if (key === 'subtipo') return getSubtipoNombre(item.subtipoId);
  if (key === 'precioArs') return item.precioVentaArs;
  if (key === 'precioUsd') return item.precioVentaUsd;
  return (item as any)[key] ?? '';
}

export function useListaPrecios() {
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const { sucursales } = useSucursales();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { revision, datos, error: errorCotizacion } = useCotizacion();
  const request = useRef(0);

  const query = useTableQuery();
  const { getSubtipoNombre } = useClasificacion();

  const sucursalId = query.filters.sucursal ?? '';

  useEffect(() => {
    if (sucursales.length > 0 && !sucursalId) {
      query.setFilters((prev) => ({ ...prev, sucursal: sucursales[0].id }));
    }
  }, [sucursales, sucursalId, query.setFilters]);

  const recargar = useCallback(async () => {
    const id = ++request.current;
    setIsLoading(true);
    try {
      const stock = await stockClient.obtenerTodos();
      if (id === request.current) { setStockTotal(stock); setError(null); }
      return stock;
    } catch (err) {
      if (id === request.current) setError(err instanceof Error ? err.message : 'No se pudo actualizar la lista.');
      throw err;
    } finally { if (id === request.current) setIsLoading(false); }
  }, []);
  useEffect(() => { void recargar().catch(() => {}); return () => { request.current++; }; }, [recargar, revision]);

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

  const aplicarSeleccion = useCallback((stock: StockItem[]) => {
    const q = query.search.trim().toLowerCase();
    const filtrados = stock.filter(item => item.sucursalId === sucursalId && item.activo &&
      (!q || item.codigo.toLowerCase().includes(q) || item.nombre.toLowerCase().includes(q)) &&
      FILTER_FIELDS.every(campo => !query.filters[campo] || String(getValor(item, campo, getSubtipoNombre)) === query.filters[campo]));
    return filtrados.sort((a, b) => {
      for (const { sortBy, sortDir } of query.sort) {
        const va = getValor(a, sortBy, getSubtipoNombre), vb = getValor(b, sortBy, getSubtipoNombre);
        if (va == null || vb == null) { if (va !== vb) return va == null ? 1 : -1; continue; }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        if (cmp) return sortDir === 'asc' ? cmp : -cmp;
      }
      return a.id.localeCompare(b.id);
    });
  }, [query.search, query.filters, query.sort, sucursalId, getSubtipoNombre]);
  const items = useMemo(() => aplicarSeleccion(stockTotal), [aplicarSeleccion, stockTotal]);
  const actualizarSeleccion = async () => aplicarSeleccion(await recargar());

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (query.page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, query.page]);

  return {
    sucursalId,
    actualizarSeleccion,
    contexto: stockTotal[0]?.contextoMonetario ?? datos,
    error: error ?? errorCotizacion,
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
