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
import { regionClient, Region } from '../../../../lib/api/region.client';
export type { SucursalOption };

/** Regiones activas que incluyen el punto de venta, ordenadas por nombre. */
interface RegionesSucursal { sucursalId: string; regiones: Region[]; error: string | null }
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
  /** Nombre de la región con la que se calcularon los precios vigentes. */
  const [regionLista, setRegionLista] = useState<string | null>(null);
  const [regionesCarga, setRegionesCarga] = useState<RegionesSucursal>({ sucursalId: '', regiones: [], error: null });
  const [regionSeleccionada, setRegionSeleccionada] = useState('');
  const requestPrecios = useRef(0);
  const sucursalActual = useRef('');
  const regionActual = useRef('');
  const ultimoReintentoSnapshot = useRef('');

  const query = useTableQuery();
  const { getSubtipoNombre } = useClasificacion();

  const sucursalId = query.filters.sucursal ?? '';
  const sucursalValida = sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo);
  const cotizacionSucursal = useCotizacionSucursal(sucursalId);
  // Las regiones (y la elegida) solo valen para la sucursal con la que se cargaron.
  const regionesListas = sucursalValida && regionesCarga.sucursalId === sucursalId;
  const regionId = regionesListas ? regionSeleccionada : '';

  useEffect(() => {
    sucursalActual.current = sucursalId;
  }, [sucursalId]);

  useEffect(() => {
    regionActual.current = regionId;
  }, [regionId]);

  // Al cambiar de sucursal se cargan sus regiones y se elige la primera.
  useEffect(() => {
    if (!sucursalId || !sucursalValida) return;
    let vigente = true;
    regionClient.obtenerPorSucursal(sucursalId, true)
      .then((lista) => {
        if (!vigente) return;
        setRegionesCarga({ sucursalId, regiones: lista, error: null });
        setRegionSeleccionada(lista[0]?.id ?? '');
      })
      .catch((err) => {
        if (!vigente) return;
        // Sin regiones la lista se calcula igual, solo con los descuentos generales.
        setRegionesCarga({
          sucursalId,
          regiones: [],
          error: err instanceof Error ? err.message : 'No se pudieron cargar las regiones del punto de venta.',
        });
        setRegionSeleccionada('');
      });
    return () => { vigente = false; };
  }, [sucursalId, sucursalValida]);

  useEffect(() => {
    const sigueAlcanzable = sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo);
    if (!sigueAlcanzable && sucursalId) {
      setStockTotal([]);
      setPrecios(new Map());
      setContextoLista(null);
      setContextoListaSucursalId('');
      setRegionLista(null);
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

  const cargarPrecios = useCallback(async (): Promise<{ precios: PreciosSucursal; contexto: ContextoMonetario | null; region: string | null }> => {
    const id = ++requestPrecios.current;
    const sucursalSolicitada = sucursalId;
    const regionSolicitada = regionId;
    const vigente = () => id === requestPrecios.current && sucursalActual.current === sucursalSolicitada && regionActual.current === regionSolicitada;
    setPrecios(new Map()); setContextoLista(null); setContextoListaSucursalId(''); setRegionLista(null); setErrorPrecios(null);
    // Se espera a tener las regiones de la sucursal para calcular con la región elegida.
    if (!sucursalId || !sucursalValida || !regionesListas) {
      return { precios: new Map(), contexto: null, region: null };
    }
    try {
      const lista = await descuentoEngineClient.listaSucursal(sucursalId, regionSolicitada || null);
      const nuevos: PreciosSucursal = new Map(lista.items.map((item) => [item.id, item]));
      const region = lista.region?.nombre ?? null;
      if (vigente()) {
        setPrecios(nuevos);
        setContextoLista(lista.contexto_monetario ?? null);
        setContextoListaSucursalId(sucursalSolicitada);
        setRegionLista(region);
        setErrorPrecios(null);
      }
      return { precios: nuevos, contexto: lista.contexto_monetario ?? null, region };
    } catch (err) {
      if (vigente()) {
        setPrecios(new Map());
        setContextoLista(null);
        setContextoListaSucursalId('');
        setRegionLista(null);
        setErrorPrecios(err instanceof Error ? err.message : 'No se pudieron calcular los descuentos.');
      }
      throw err;
    }
  }, [sucursalId, sucursalValida, regionesListas, regionId]);
  useEffect(() => {
    let vigente = true;
    const contador = requestPrecios;
    void Promise.resolve().then(() => (vigente ? cargarPrecios() : undefined)).catch(() => {});
    return () => { vigente = false; contador.current++; };
  }, [cargarPrecios, cotizacionSucursal.revision]);

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

  const regionOptions = useMemo(
    () => (regionesListas ? regionesCarga.regiones : []).map((r) => ({ value: r.id, label: r.nombre })),
    [regionesListas, regionesCarga.regiones]
  );

  const { setPage } = query;
  const onRegionChange = useCallback((value: string) => {
    setRegionSeleccionada(value);
    setPage(1);
  }, [setPage]);

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
    const regionSolicitada = regionId;
    try {
      await descuentoEngineClient.listaSucursal(solicitada, regionSolicitada || null);
      if (sucursalActual.current !== solicitada) throw new Error('El punto de venta cambió. Actualizá la lista antes de exportar.');
      if (regionActual.current !== regionSolicitada) throw new Error('La región cambió. Actualizá la lista antes de exportar.');
    } catch (err) {
      if (sucursalActual.current === solicitada && regionActual.current === regionSolicitada) {
        setStockTotal([]);
        setPrecios(new Map());
        setContextoLista(null);
        setContextoListaSucursalId('');
        setRegionLista(null);
        setErrorPrecios(err instanceof Error ? err.message : 'La lista ya no está disponible.');
      }
      throw err;
    }
  }, [sucursalId, sucursales, regionId]);
  const items = useMemo(
    () => sucursalValida && snapshotCompatible ? aplicarSeleccion(stockTotal, precios) : [],
    [sucursalValida, snapshotCompatible, aplicarSeleccion, stockTotal, precios]
  );
  const actualizarSeleccion = async () => {
    if (!sucursalId || !sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo)) {
      throw new Error('Seleccioná un punto de venta activo dentro de tu alcance antes de actualizar la lista.');
    }
    if (!regionesListas) throw new Error('Esperá a que carguen las regiones del punto de venta.');
    const [stock, resultado] = await Promise.all([recargar(), cargarPrecios()]);
    if (sucursalActual.current !== sucursalId) throw new Error('El punto de venta cambió. Actualizá la lista antes de exportar.');
    if (regionActual.current !== regionId) throw new Error('La región cambió. Actualizá la lista antes de exportar.');
    const filasSucursal = stock.filter((item) => item.sucursalId === sucursalId && item.activo);
    if (resultado.contexto && !filasSucursal.every((item) => mismoContexto(item.contextoMonetario, resultado.contexto))) {
      throw new Error('La cotización cambió durante la actualización. Volvé a actualizar la lista antes de exportar.');
    }
    return { items: aplicarSeleccion(stock, resultado.precios), precios: resultado.precios, contexto: resultado.contexto, regionNombre: resultado.region };
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
    error: error ?? errorPrecios ?? (regionesListas ? regionesCarga.error : null) ?? cotizacionSucursal.error ?? (!snapshotCompatible ? 'La cotización del PDV cambió mientras se cargaba la lista; actualizando los precios.' : null),
    precios,
    sucursalOptions,
    regionId,
    regionOptions,
    onRegionChange,
    /** Región con la que se calcularon los precios mostrados (para exportar). */
    regionNombre: regionLista,
    items,
    pageItems,
    ...query,
    page: Math.min(query.page, totalPages),
    totalPages,
    // Mientras cargan las regiones no se muestran precios sin el descuento de región.
    isLoading: isLoading || (sucursalValida && !regionesListas),
    sucursalNombre,
    filterOptions,
  };
}
