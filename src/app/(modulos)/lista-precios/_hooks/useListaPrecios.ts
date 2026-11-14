'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import { useTableQuery } from '../../../../lib/hooks/useTableQuery';
import { descuentoEngineClient } from '../../../../lib/api/descuento-engine.client';
import { Region, regionClient } from '../../../../lib/api/region.client';
import { ItemConMargenCalculado } from '../../../../lib/types/ListaPreciosCliente';
import { ContextoMonetario } from '../../../../lib/types/Moneda';
import { useCotizacionSucursal } from '../../../../lib/hooks/useCotizacionSucursal';
import { formatPorcentaje } from '../../../../lib/utils/formatters';
export type { SucursalOption };
export interface RegionOption {
  value: string;
  label: string;
}
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
  const [contextoListaRegionId, setContextoListaRegionId] = useState('');
  const [regionLista, setRegionLista] = useState<string | null>(null);
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const requestPrecios = useRef(0);
  const sucursalActual = useRef('');
  const regionActual = useRef('');
  const ultimoReintentoSnapshot = useRef('');

  const query = useTableQuery();
  const { getSubtipoNombre } = useClasificacion();

  const sucursalId = query.filters.sucursal ?? '';
  const regionId = query.filters.region ?? '';
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [cargandoRegiones, setCargandoRegiones] = useState(false);
  const cotizacionSucursal = useCotizacionSucursal(sucursalId);

  const sucursalesValidas = useMemo(() => sucursales.filter((s) => s.activo), [sucursales]);
  const sucursalValida = sucursalesValidas.some((sucursal) => sucursal.id === sucursalId);

  useEffect(() => {
    if (sucursalesValidas.length === 1 && !query.filters.sucursal) {
      query.setFilters((prev) => ({ ...prev, sucursal: sucursalesValidas[0].id }));
    }
  }, [sucursalesValidas, query.filters.sucursal, query.setFilters]);

  useEffect(() => {
    sucursalActual.current = sucursalId;
    regionActual.current = regionId;
  }, [sucursalId, regionId]);

  const regionIdRef = useRef(regionId);
  regionIdRef.current = regionId;

  useEffect(() => {
    let cancelado = false;
    if (!sucursalId) {
      setRegiones([]);
      setCargandoRegiones(false);
      return;
    }
    setCargandoRegiones(true);
    regionClient
      .obtenerPorSucursal(sucursalId, true)
      .then((regs) => {
        if (cancelado) return;
        setRegiones(regs);
        const valida = regs.some((r) => r.id === regionIdRef.current);
        const nuevaRegion = valida ? regionIdRef.current : (regs.length === 1 ? regs[0].id : '');
        if (nuevaRegion !== regionIdRef.current) {
          query.setFilters((prev) => ({ ...prev, region: nuevaRegion }));
        }
      })
      .catch(() => {
        if (!cancelado) setRegiones([]);
      })
      .finally(() => {
        if (!cancelado) setCargandoRegiones(false);
      });
    return () => {
      cancelado = true;
    };
  }, [sucursalId, query.setFilters]);

  const cargarStock = useCallback(async () => {
    const requestId = ++request.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockClient.obtenerTodos();
      if (requestId === request.current) {
        setStockTotal(data);
      }
      return data;
    } catch (err) {
      if (requestId === request.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar el stock');
        setStockTotal([]);
      }
      throw err;
    } finally {
      if (requestId === request.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const cargarPrecios = useCallback(async () => {
    const solicitada = sucursalId;
    const regionSolicitada = regionId;
    const req = ++requestPrecios.current;
    if (!solicitada || !sucursalValida) {
      setPrecios(new Map());
      setErrorPrecios(null);
      setContextoLista(null);
      setContextoListaSucursalId('');
      setContextoListaRegionId('');
      setRegionLista(null);
      setCargandoPrecios(false);
      return { precios: new Map() as PreciosSucursal, contexto: null, region: null };
    }
    setCargandoPrecios(true);
    setErrorPrecios(null);
    try {
      const resultado = await descuentoEngineClient.listaSucursal(solicitada, regionSolicitada || undefined);
      if (req !== requestPrecios.current) return { precios: new Map() as PreciosSucursal, contexto: null, region: null };
      const mapa = new Map<string, ItemConMargenCalculado>();
      (resultado.items ?? []).forEach((item) => {
        mapa.set(item.id, item);
      });
      setPrecios(mapa);
      setContextoLista(resultado.contexto_monetario ?? null);
      setContextoListaSucursalId(solicitada);
      setContextoListaRegionId(regionSolicitada);
      setRegionLista(resultado.region?.nombre ?? null);
      return {
        precios: mapa,
        contexto: resultado.contexto_monetario ?? null,
        region: resultado.region?.nombre ?? null,
      };
    } catch (err) {
      if (req === requestPrecios.current) {
        setPrecios(new Map());
        setContextoLista(null);
        setContextoListaSucursalId('');
        setContextoListaRegionId('');
        setRegionLista(null);
        setErrorPrecios(err instanceof Error ? err.message : 'Error al calcular los precios');
      }
      throw err;
    } finally {
      if (req === requestPrecios.current) {
        setCargandoPrecios(false);
      }
    }
  }, [sucursalId, sucursalValida, regionId]);

  const recargar = useCallback(() => cargarStock(), [cargarStock]);

  useEffect(() => {
    cargarStock();
  }, [cargarStock]);

  useEffect(() => {
    cargarPrecios().catch(() => {});
  }, [cargarPrecios, cotizacionSucursal.revision]);

  const contextoEsperado = useMemo(() => {
    if (!sucursalId) return null;
    const itemsDeSucursal = stockTotal.filter((item) => item.sucursalId === sucursalId && item.activo);
    return itemsDeSucursal[0]?.contextoMonetario ?? null;
  }, [stockTotal, sucursalId]);

  const contextoActualLista = sucursalId && contextoListaSucursalId === sucursalId && contextoListaRegionId === regionId ? contextoLista : null;
  const snapshotCompatible = !sucursalId || !contextoEsperado || !contextoActualLista || mismoContexto(contextoEsperado, contextoActualLista);

  useEffect(() => {
    if (!sucursalId || snapshotCompatible) return;
    const clave = `${sucursalId}:${regionId}:${contextoEsperado?.cotizacion_version ?? ''}:${cotizacionSucursal.revision}`;
    if (ultimoReintentoSnapshot.current === clave) return;
    ultimoReintentoSnapshot.current = clave;
    cargarPrecios().catch(() => {});
  }, [sucursalId, regionId, snapshotCompatible, contextoEsperado, cotizacionSucursal.revision, cargarPrecios]);

  const sucursalNombre = useMemo(() => {
    return sucursales.find((s) => s.id === sucursalId)?.nombre ?? '';
  }, [sucursales, sucursalId]);

  const sucursalOptions: SucursalOption[] = useMemo(() => {
    return sucursales
      .filter((s) => s.activo)
      .map((s) => ({ value: s.id, label: s.nombre }));
  }, [sucursales]);

  const regionOptions: RegionOption[] = useMemo(() => {
    const opciones: RegionOption[] = [{ value: '', label: 'Sin región' }];
    for (const r of regiones) {
      opciones.push({
        value: r.id,
        label: `${r.nombre} (${formatPorcentaje(r.descuento)})`,
      });
    }
    return opciones;
  }, [regiones]);

  const regionNombre = useMemo(() => {
    if (regionLista) return regionLista;
    if (!regionId) return '';
    return regiones.find((r) => r.id === regionId)?.nombre ?? '';
  }, [regionLista, regiones, regionId]);

  const onRegionChange = useCallback((id: string) => {
    query.setFilters((prev) => ({ ...prev, region: id }));
  }, [query]);

  const itemsSucursal = useMemo(() => {
    if (!sucursalValida) return [];
    return stockTotal.filter((item) => item.sucursalId === sucursalId && item.activo);
  }, [stockTotal, sucursalId, sucursalValida]);

  const filterOptions = useMemo(() => {
    const options: Record<string, { value: string; label: string }[]> = {
      sucursal: sucursalOptions,
      region: regionOptions,
    };
    FILTER_FIELDS.forEach((campo) => {
      const valores = Array.from(
        new Set(itemsSucursal.map((item) => String(getValor(item, campo, getSubtipoNombre, precios) ?? '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));
      options[campo] = valores.map((v) => ({ value: v, label: v }));
    });
    return options;
  }, [itemsSucursal, getSubtipoNombre, sucursalOptions, regionOptions, precios]);

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
    const regionSolicitada = regionId;
    if (!solicitada || !sucursales.some((sucursal) => sucursal.id === solicitada && sucursal.activo)) {
      throw new Error('Seleccioná un punto de venta activo dentro de tu alcance antes de exportar.');
    }
    try {
      await descuentoEngineClient.listaSucursal(solicitada, regionSolicitada || undefined);
      if (sucursalActual.current !== solicitada || regionActual.current !== regionSolicitada) {
        throw new Error('El punto de venta o región cambió. Actualizá la lista antes de exportar.');
      }
    } catch (err) {
      if (sucursalActual.current === solicitada && regionActual.current === regionSolicitada) {
        setStockTotal([]);
        setPrecios(new Map());
        setContextoLista(null);
        setContextoListaSucursalId('');
        setContextoListaRegionId('');
        setRegionLista(null);
        setErrorPrecios(err instanceof Error ? err.message : 'La lista ya no está disponible.');
      }
      throw err;
    }
  }, [sucursalId, regionId, sucursales]);

  const items = useMemo(
    () => sucursalValida && snapshotCompatible ? aplicarSeleccion(stockTotal, precios) : [],
    [sucursalValida, snapshotCompatible, aplicarSeleccion, stockTotal, precios]
  );

  const actualizarSeleccion = async () => {
    if (!sucursalId || !sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo)) {
      throw new Error('Seleccioná un punto de venta activo dentro de tu alcance antes de actualizar la lista.');
    }
    const [stock, resultado] = await Promise.all([recargar(), cargarPrecios()]);
    if (sucursalActual.current !== sucursalId || regionActual.current !== regionId) {
      throw new Error('El punto de venta o región cambió. Actualizá la lista antes de exportar.');
    }
    const filasSucursal = stock.filter((item) => item.sucursalId === sucursalId && item.activo);
    if (resultado.contexto && !filasSucursal.every((item) => mismoContexto(item.contextoMonetario, resultado.contexto))) {
      throw new Error('La cotización cambió durante la actualización. Volvé a actualizar la lista antes de exportar.');
    }
    return {
      items: aplicarSeleccion(stock, resultado.precios),
      precios: resultado.precios,
      contexto: resultado.contexto,
      regionNombre: resultado.region,
    };
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (query.page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, query.page]);

  return {
    sucursalId,
    regionId,
    regionOptions,
    onRegionChange,
    regionNombre,
    regionesDisponibles: regiones.length,
    cargandoRegiones,
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
    isLoading: isLoading || cargandoPrecios || cargandoRegiones,
    sucursalNombre,
    filterOptions,
  };
}
