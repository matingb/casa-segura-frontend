'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useTableQuery } from '../../../../lib/hooks/useTableQuery';
import { descuentoEngineClient } from '../../../../lib/api/descuento-engine.client';
import { ItemConMargenCalculado } from '../../../../lib/types/ListaPreciosCliente';
import { ContextoMonetario } from '../../../../lib/types/Moneda';
import { useCotizacionSucursal } from '../../../../lib/hooks/useCotizacionSucursal';
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
  const valor = item[key as keyof StockItem];
  return typeof valor === 'string' || typeof valor === 'number' ? valor : null;
}

function mismoContexto(a: ContextoMonetario | null | undefined, b: ContextoMonetario | null | undefined) {
  if (!a || !b) return false;
  return a.cotizacion_version === b.cotizacion_version &&
    a.cotizacion_usd_ars === b.cotizacion_usd_ars &&
    (a.sucursal_id ?? null) === (b.sucursal_id ?? null) &&
    (a.origen ?? (a.sucursal_id ? 'SUCURSAL' : 'TENANT')) === (b.origen ?? (b.sucursal_id ? 'SUCURSAL' : 'TENANT'));
}

export function useListaPrecios() {
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const { sucursales } = useSucursales();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const [precios, setPrecios] = useState<PreciosSucursal>(new Map());
  const [errorPrecios, setErrorPrecios] = useState<string | null>(null);
  const [contextoLista, setContextoLista] = useState<ContextoMonetario | null>(null);
  const [contextoListaSucursalId, setContextoListaSucursalId] = useState('');
  const requestPrecios = useRef(0);
  const sucursalActual = useRef('');
  const ultimoReintentoSnapshot = useRef('');

  const query = useTableQuery();
  const { getSubtipoNombre } = useClasificacion();

  const sucursalId = query.filters.sucursal ?? '';
  const cotizacionSucursal = useCotizacionSucursal(sucursalId);

  useEffect(() => {
    sucursalActual.current = sucursalId;
  }, [sucursalId]);

  useEffect(() => {
    const sigueAlcanzable = sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo);
    if (!sigueAlcanzable && sucursalId) {
      setStockTotal([]);
      setPrecios(new Map());
      setContextoLista(null);
      setContextoListaSucursalId('');
      query.setFilters((prev) => ({ ...prev, sucursal: sucursales[0]?.id ?? '' }));
    } else if (sucursales.length > 0 && !sucursalId) {
      query.setFilters((prev) => ({ ...prev, sucursal: sucursales[0].id }));
    }
  }, [sucursales, sucursalId, query.setFilters]);

  const recargar = useCallback(async () => {
    const id = ++request.current;
    const sucursalSolicitada = sucursalId;
    if (!sucursalSolicitada || !sucursales.some((sucursal) => sucursal.id === sucursalSolicitada && sucursal.activo)) {
      setStockTotal([]);
      setError(null);
      setIsLoading(false);
      return [];
    }
    setStockTotal([]);
    setError(null);
    setIsLoading(true);
    try {
      const stock = await stockClient.obtenerTodos({ sucursalId: sucursalSolicitada, operativo: true });
      if (id !== request.current || sucursalActual.current !== sucursalSolicitada) {
        throw new Error('El punto de venta cambió. Actualizá la lista antes de exportar.');
      }
      if (id === request.current && sucursalActual.current === sucursalSolicitada) { setStockTotal(stock); setError(null); }
      return stock;
    } catch (err) {
      if (id === request.current && sucursalActual.current === sucursalSolicitada) {
        setStockTotal([]);
        setError(err instanceof Error ? err.message : 'No se pudo actualizar la lista.');
      }
      throw err;
    } finally { if (id === request.current) setIsLoading(false); }
  }, [sucursalId, sucursales]);
  useEffect(() => { void recargar().catch(() => {}); return () => { request.current++; }; }, [recargar, cotizacionSucursal.revision]);

  const cargarPrecios = useCallback(async (): Promise<{ precios: PreciosSucursal; contexto: ContextoMonetario | null }> => {
    const id = ++requestPrecios.current;
    const sucursalSolicitada = sucursalId;
    if (!sucursalId || !sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo)) {
      setPrecios(new Map()); setContextoLista(null); setContextoListaSucursalId(''); setErrorPrecios(null);
      return { precios: new Map(), contexto: null };
    }
    setPrecios(new Map()); setContextoLista(null); setContextoListaSucursalId(''); setErrorPrecios(null);
    try {
      const lista = await descuentoEngineClient.listaSucursal(sucursalId);
      const nuevos: PreciosSucursal = new Map(lista.items.map((item) => [item.id, item]));
      if (id === requestPrecios.current && sucursalActual.current === sucursalSolicitada) {
        setPrecios(nuevos);
        setContextoLista(lista.contexto_monetario ?? null);
        setContextoListaSucursalId(sucursalSolicitada);
        setErrorPrecios(null);
      }
      return { precios: nuevos, contexto: lista.contexto_monetario ?? null };
    } catch (err) {
      if (id === requestPrecios.current && sucursalActual.current === sucursalSolicitada) {
        setPrecios(new Map());
        setContextoLista(null);
        setContextoListaSucursalId('');
        setErrorPrecios(err instanceof Error ? err.message : 'No se pudieron calcular los descuentos.');
      }
      throw err;
    }
  }, [sucursalId, sucursales]);
  useEffect(() => {
    let vigente = true;
    const contador = requestPrecios;
    void Promise.resolve().then(() => (vigente ? cargarPrecios() : undefined)).catch(() => {});
    return () => { vigente = false; contador.current++; };
  }, [cargarPrecios, cotizacionSucursal.revision]);

  const sucursalValida = sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo);
  const contextoActualLista = sucursalValida && contextoListaSucursalId === sucursalId ? contextoLista : null;
  const stockDeSucursal = useMemo(
    () => sucursalValida ? stockTotal.filter((item) => item.sucursalId === sucursalId && item.activo) : [],
    [stockTotal, sucursalId, sucursalValida]
  );
  const snapshotCompatible = !contextoActualLista || stockDeSucursal.every((item) => mismoContexto(item.contextoMonetario, contextoActualLista));

  useEffect(() => {
    if (!sucursalId || !contextoActualLista || snapshotCompatible || isLoading) return;
    const tokens = Array.from(new Set(stockDeSucursal.map((item) => item.contextoMonetario?.cotizacion_version ?? 'sin-contexto'))).sort().join(',');
    const clave = `${sucursalId}|${contextoActualLista.cotizacion_version}|${tokens}`;
    if (ultimoReintentoSnapshot.current === clave) return;
    ultimoReintentoSnapshot.current = clave;
    void Promise.all([recargar(), cargarPrecios()]).catch(() => {});
  }, [sucursalId, contextoActualLista, snapshotCompatible, isLoading, stockDeSucursal, recargar, cargarPrecios]);

  const sucursalOptions: SucursalOption[] = useMemo(
    () => sucursales.map((s) => ({ value: s.id, label: s.nombre })),
    [sucursales]
  );

  const sucursalNombre = useMemo(
    () => sucursales.find((s) => s.id === sucursalId)?.nombre ?? '',
    [sucursales, sucursalId]
  );

  const itemsSucursal = useMemo(() => {
    if (!sucursalValida) return [];
    return stockTotal.filter((item) => item.sucursalId === sucursalId && item.activo);
  }, [stockTotal, sucursalId, sucursalValida]);

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
  const revalidarAcceso = useCallback(async () => {
    const solicitada = sucursalId;
    if (!solicitada || !sucursales.some((sucursal) => sucursal.id === solicitada && sucursal.activo)) {
      throw new Error('Seleccioná un punto de venta activo dentro de tu alcance antes de exportar.');
    }
    try {
      await descuentoEngineClient.listaSucursal(solicitada);
      if (sucursalActual.current !== solicitada) throw new Error('El punto de venta cambió. Actualizá la lista antes de exportar.');
    } catch (err) {
      if (sucursalActual.current === solicitada) {
        setStockTotal([]);
        setPrecios(new Map());
        setContextoLista(null);
        setContextoListaSucursalId('');
        setErrorPrecios(err instanceof Error ? err.message : 'La lista ya no está disponible.');
      }
      throw err;
    }
  }, [sucursalId, sucursales]);
  const items = useMemo(
    () => sucursalValida && snapshotCompatible ? aplicarSeleccion(stockTotal, precios) : [],
    [sucursalValida, snapshotCompatible, aplicarSeleccion, stockTotal, precios]
  );
  const actualizarSeleccion = async () => {
    if (!sucursalId || !sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo)) {
      throw new Error('Seleccioná un punto de venta activo dentro de tu alcance antes de actualizar la lista.');
    }
    const [stock, resultado] = await Promise.all([recargar(), cargarPrecios()]);
    if (sucursalActual.current !== sucursalId) throw new Error('El punto de venta cambió. Actualizá la lista antes de exportar.');
    const filasSucursal = stock.filter((item) => item.sucursalId === sucursalId && item.activo);
    if (resultado.contexto && !filasSucursal.every((item) => mismoContexto(item.contextoMonetario, resultado.contexto))) {
      throw new Error('La cotización cambió durante la actualización. Volvé a actualizar la lista antes de exportar.');
    }
    return { items: aplicarSeleccion(stock, resultado.precios), precios: resultado.precios, contexto: resultado.contexto };
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (query.page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, query.page]);

  return {
    sucursalId,
    actualizarSeleccion,
    revalidarAcceso,
    contexto: contextoActualLista,
    error: error ?? errorPrecios ?? cotizacionSucursal.error ?? (!snapshotCompatible ? 'La cotización del PDV cambió mientras se cargaba la lista; actualizando los precios.' : null),
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
