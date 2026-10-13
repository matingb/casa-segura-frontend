'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useTableQuery } from '../../../../lib/hooks/useTableQuery';
import { descuentoEngineClient } from '../../../../lib/api/descuento-engine.client';
import { ItemConMargenCalculado } from '../../../../lib/types/ListaPreciosCliente';

import { useCotizacion } from '../../../../context/CotizacionContext';
export type { SucursalOption };
/** Precio con los descuentos generales de la sucursal, por id de producto_sucursal. */
export type PreciosSucursal = Map<string, ItemConMargenCalculado>;

const PAGE_SIZE = 10;
const FILTER_FIELDS = ['marca', 'modelo', 'subtipo'] as const;

function getValor(item: StockItem, key: string, getSubtipoNombre: (id: string) => string, precios: PreciosSucursal): string | number | null {
  if (key === 'subtipo') return getSubtipoNombre(item.subtipoId);
  if (key === 'precioArs') return item.precioVentaArs;
  if (key === 'precioUsd') return item.precioVentaUsd;
  const precio = precios.get(item.id);
  if (key === 'descuento') return precio?.descuentoTotalPorcentaje ?? 0;
  if (key === 'precioFinalArs') return precio?.precioFinalArs == null ? item.precioVentaArs : Number(precio.precioFinalArs);
  if (key === 'precioFinalUsd') return precio?.precioFinalUsd == null ? item.precioVentaUsd : Number(precio.precioFinalUsd);
  return (item as any)[key] ?? '';
}

export function useListaPrecios() {
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const { sucursales } = useSucursales();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { revision, datos, error: errorCotizacion } = useCotizacion();
  const request = useRef(0);
  const [precios, setPrecios] = useState<PreciosSucursal>(new Map());
  const [errorPrecios, setErrorPrecios] = useState<string | null>(null);
  const requestPrecios = useRef(0);

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

  const cargarPrecios = useCallback(async (): Promise<PreciosSucursal> => {
    const id = ++requestPrecios.current;
    if (!sucursalId) { setPrecios(new Map()); return new Map(); }
    try {
      const lista = await descuentoEngineClient.listaSucursal(sucursalId);
      const nuevos: PreciosSucursal = new Map(lista.items.map((item) => [item.id, item]));
      if (id === requestPrecios.current) { setPrecios(nuevos); setErrorPrecios(null); }
      return nuevos;
    } catch (err) {
      if (id === requestPrecios.current) setErrorPrecios(err instanceof Error ? err.message : 'No se pudieron calcular los descuentos.');
      throw err;
    }
  }, [sucursalId]);
  useEffect(() => {
    let vigente = true;
    const contador = requestPrecios;
    void Promise.resolve().then(() => (vigente ? cargarPrecios() : undefined)).catch(() => {});
    return () => { vigente = false; contador.current++; };
  }, [cargarPrecios, revision]);

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
        new Set(itemsSucursal.map((item) => String(getValor(item, campo, getSubtipoNombre, precios) ?? '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));
      options[campo] = valores.map((v) => ({ value: v, label: v }));
    });
    return options;
  }, [itemsSucursal, getSubtipoNombre, sucursalOptions, precios]);

  const aplicarSeleccion = useCallback((stock: StockItem[], preciosVista: PreciosSucursal) => {
    const q = query.search.trim().toLowerCase();
    const filtrados = stock.filter(item => item.sucursalId === sucursalId && item.activo &&
      (!q || item.codigo.toLowerCase().includes(q) || item.nombre.toLowerCase().includes(q)) &&
      FILTER_FIELDS.every(campo => !query.filters[campo] || String(getValor(item, campo, getSubtipoNombre, preciosVista)) === query.filters[campo]));
    return filtrados.sort((a, b) => {
      for (const { sortBy, sortDir } of query.sort) {
        const va = getValor(a, sortBy, getSubtipoNombre, preciosVista), vb = getValor(b, sortBy, getSubtipoNombre, preciosVista);
        if (va == null || vb == null) { if (va !== vb) return va == null ? 1 : -1; continue; }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        if (cmp) return sortDir === 'asc' ? cmp : -cmp;
      }
      return a.id.localeCompare(b.id);
    });
  }, [query.search, query.filters, query.sort, sucursalId, getSubtipoNombre]);
  const items = useMemo(() => aplicarSeleccion(stockTotal, precios), [aplicarSeleccion, stockTotal, precios]);
  const actualizarSeleccion = async () => {
    const [stock, nuevos] = await Promise.all([recargar(), cargarPrecios()]);
    return { items: aplicarSeleccion(stock, nuevos), precios: nuevos };
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (query.page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, query.page]);

  return {
    sucursalId,
    actualizarSeleccion,
    contexto: stockTotal[0]?.contextoMonetario ?? datos,
    error: error ?? errorPrecios ?? errorCotizacion,
    precios,
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
