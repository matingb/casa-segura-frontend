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
import { formatPorcentaje } from '../../../../lib/utils/formatters';
export type { SucursalOption };
export interface RegionOption {
  value: string;
  label: string;
}

/** Regiones activas que incluyen el punto de venta, ordenadas por nombre. */
interface RegionesSucursal {
  sucursalId: string;
  estado: 'idle' | 'loading' | 'success' | 'error';
  regiones: Region[];
  error: string | null;
}
interface CargaStock {
  sucursalId: string;
  revision: number;
  estado: 'idle' | 'loading' | 'success' | 'error';
  items: StockItem[];
  error: string | null;
}
interface CargaPrecios {
  clave: string;
  estado: 'idle' | 'loading' | 'success' | 'error';
  precios: PreciosSucursal;
  contexto: ContextoMonetario | null;
  regionNombre: string | null;
  error: string | null;
}
/** Precio con los descuentos generales de la sucursal, por id de producto_sucursal. */
export type PreciosSucursal = Map<string, ItemConMargenCalculado>;

const PAGE_SIZE = 10;
const FILTER_FIELDS = ['marca', 'modelo', 'subtipo'] as const;
const ESTADO_REGIONES_INICIAL: RegionesSucursal = { sucursalId: '', estado: 'idle', regiones: [], error: null };
const ESTADO_STOCK_INICIAL: CargaStock = { sucursalId: '', revision: -1, estado: 'idle', items: [], error: null };
const ESTADO_PRECIOS_INICIAL: CargaPrecios = { clave: '', estado: 'idle', precios: new Map(), contexto: null, regionNombre: null, error: null };
const PRECIOS_VACIOS: PreciosSucursal = new Map();

function claveLista(sucursalId: string, regionId: string, revision: number) {
  return JSON.stringify([sucursalId, regionId, revision]);
}

function getValor(item: StockItem, key: string, getSubtipoNombre: (id: string) => string, precios: PreciosSucursal): string | number | null {
  if (key === 'subtipo') return getSubtipoNombre(item.subtipoId);
  if (key === 'precioArs') return item.precioVentaArs;
  if (key === 'precioUsd') return item.precioVentaUsd;
  const precio = precios.get(item.id);
  if (key === 'descuento') return precio?.descuentoTotalPorcentaje ?? null;
  if (key === 'precioFinalArs') return precio?.precioFinalArs == null ? null : Number(precio.precioFinalArs);
  if (key === 'precioFinalUsd') return precio?.precioFinalUsd == null ? null : Number(precio.precioFinalUsd);
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

function claveContexto(contexto: ContextoMonetario | null | undefined) {
  if (!contexto) return 'sin-contexto';
  return JSON.stringify([
    contexto.cotizacion_version,
    contexto.cotizacion_usd_ars,
    contexto.sucursal_id ?? null,
    contexto.origen ?? (contexto.sucursal_id ? 'SUCURSAL' : 'TENANT'),
  ]);
}

export function useListaPrecios() {
  const { sucursales } = useSucursales();
  // Por defecto se selecciona el primer PDV activo (la primera opción del selector).
  const primeraSucursalActiva = useMemo(() => sucursales.find((sucursal) => sucursal.activo)?.id ?? '', [sucursales]);
  const query = useTableQuery();
  const setQueryFilters = query.setFilters;
  const aplicarFiltroQuery = query.onFilterChange;
  const { getSubtipoNombre } = useClasificacion();
  const sucursalId = query.filters.sucursal ?? '';
  const sucursalValida = sucursales.some((sucursal) => sucursal.id === sucursalId && sucursal.activo);
  const cotizacionSucursal = useCotizacionSucursal(sucursalValida ? sucursalId : null);

  const [cargaStock, setCargaStock] = useState<CargaStock>(ESTADO_STOCK_INICIAL);
  const [cargaPrecios, setCargaPrecios] = useState<CargaPrecios>(ESTADO_PRECIOS_INICIAL);
  const [regionesCarga, setRegionesCarga] = useState<RegionesSucursal>(ESTADO_REGIONES_INICIAL);
  const [regionSeleccionada, setRegionSeleccionada] = useState('');
  const [reintentoManual, setReintentoManual] = useState(0);
  const [snapshotReintentado, setSnapshotReintentado] = useState('');
  const requestStock = useRef(0);
  const requestPrecios = useRef(0);
  const requestRegiones = useRef(0);
  const requestAcceso = useRef(0);
  const sucursalActual = useRef(sucursalId);
  const regionActual = useRef('');
  const sucursalValidaActual = useRef(sucursalValida);
  const revisionActual = useRef(cotizacionSucursal.revision);
  const regionSeleccionadaActual = useRef(regionSeleccionada);
  /** El usuario eligió «Sin región» a propósito: se respeta al reintentar en el mismo PDV. */
  const sinRegionElegida = useRef(false);

  // Depende de valores derivados (no de la referencia del arreglo) para no disparar API calls.
  // Sin PDV o con uno fuera de alcance, se cae al primer PDV activo.
  useEffect(() => {
    if (sucursalValida) return;
    if (sucursalId !== primeraSucursalActiva) {
      setQueryFilters((prev) => ({ ...prev, sucursal: primeraSucursalActiva }));
    }
  }, [sucursalId, sucursalValida, primeraSucursalActiva, setQueryFilters]);

  const sucursalNombre = useMemo(
    () => sucursales.find((sucursal) => sucursal.id === sucursalId)?.nombre ?? '',
    [sucursales, sucursalId]
  );

  const regionesCargaVigente = regionesCarga.sucursalId === sucursalId
    ? regionesCarga
    : { sucursalId, estado: sucursalValida ? 'loading' as const : 'idle' as const, regiones: [], error: null };
  const regionesVigentes = sucursalValida && regionesCargaVigente.sucursalId === sucursalId;
  const regionesListas = regionesVigentes && regionesCargaVigente.estado === 'success';
  const errorRegiones = regionesVigentes && regionesCargaVigente.estado === 'error' ? regionesCargaVigente.error : null;
  const regionId = regionesListas ? regionSeleccionada : '';
  const clavePreciosActual = claveLista(sucursalId, regionId, cotizacionSucursal.revision);
  useEffect(() => {
    sucursalActual.current = sucursalId;
    sucursalValidaActual.current = sucursalValida;
    regionActual.current = regionId;
    revisionActual.current = cotizacionSucursal.revision;
    regionSeleccionadaActual.current = regionSeleccionada;
  }, [sucursalId, sucursalValida, regionId, cotizacionSucursal.revision, regionSeleccionada]);

  useEffect(() => {
    const id = ++requestRegiones.current;
    if (!sucursalId || !sucursalValida) return;
    let vigente = true;
    regionClient.obtenerPorSucursal(sucursalId, true)
      .then((regiones) => {
        if (!vigente || id !== requestRegiones.current || sucursalActual.current !== sucursalId) return;
        setRegionesCarga({ sucursalId, estado: 'success', regiones, error: null });
        // Se conserva la región elegida si sigue vigente; si no, se selecciona la primera
        // región del PDV. Sin regiones, queda «Sin región».
        const actual = regionSeleccionadaActual.current;
        const conservar = actual ? regiones.some((region) => region.id === actual) : sinRegionElegida.current;
        setRegionSeleccionada(conservar ? actual : regiones[0]?.id ?? '');
      })
      .catch((err) => {
        if (!vigente || id !== requestRegiones.current || sucursalActual.current !== sucursalId) return;
        setRegionesCarga({
          sucursalId,
          estado: 'error',
          regiones: [],
          error: err instanceof Error ? err.message : 'No se pudieron cargar las regiones del punto de venta.',
        });
        setRegionSeleccionada('');
      });
    return () => {
      vigente = false;
      requestRegiones.current++;
    };
  }, [sucursalId, sucursalValida, reintentoManual]);

  const recargar = useCallback(async () => {
    const id = ++requestStock.current;
    const solicitada = sucursalId;
    const revisionSolicitada = cotizacionSucursal.revision;
    if (!solicitada || !sucursalValida) {
      setCargaStock({ sucursalId: solicitada, revision: revisionSolicitada, estado: 'idle', items: [], error: null });
      return [];
    }
    setCargaStock({ sucursalId: solicitada, revision: revisionSolicitada, estado: 'loading', items: [], error: null });
    try {
      const stock = await stockClient.obtenerTodos({ sucursalId: solicitada, operativo: true });
      if (id !== requestStock.current || sucursalActual.current !== solicitada || revisionActual.current !== revisionSolicitada || !sucursalValidaActual.current) {
        throw new Error('El punto de venta cambió. Actualizá la lista antes de exportar.');
      }
      setCargaStock({ sucursalId: solicitada, revision: revisionSolicitada, estado: 'success', items: stock, error: null });
      return stock;
    } catch (err) {
      if (id === requestStock.current && sucursalActual.current === solicitada && revisionActual.current === revisionSolicitada) {
        setCargaStock({
          sucursalId: solicitada,
          revision: revisionSolicitada,
          estado: 'error',
          items: [],
          error: err instanceof Error ? err.message : 'No se pudo actualizar la lista.',
        });
      }
      throw err;
    }
  }, [sucursalId, sucursalValida, cotizacionSucursal.revision]);

  useEffect(() => {
    if (!sucursalId || !sucursalValida || cotizacionSucursal.cargando) return;
    let vigente = true;
    void Promise.resolve().then(() => vigente ? recargar() : undefined).catch(() => undefined);
    return () => {
      vigente = false;
      requestStock.current++;
    };
  }, [sucursalId, sucursalValida, cotizacionSucursal.cargando, recargar, reintentoManual]);

  const cargarPrecios = useCallback(async (): Promise<{ precios: PreciosSucursal; contexto: ContextoMonetario | null; region: string | null }> => {
    const id = ++requestPrecios.current;
    const solicitada = sucursalId;
    const regionSolicitada = regionId;
    const revisionSolicitada = cotizacionSucursal.revision;
    const claveSolicitada = claveLista(solicitada, regionSolicitada, revisionSolicitada);
    const vigente = () => id === requestPrecios.current && sucursalActual.current === solicitada &&
      regionActual.current === regionSolicitada && revisionActual.current === revisionSolicitada && sucursalValidaActual.current;
    if (!solicitada || !sucursalValida || !regionesListas || cotizacionSucursal.cargando) {
      setCargaPrecios({ ...ESTADO_PRECIOS_INICIAL, clave: claveSolicitada });
      return { precios: new Map(), contexto: null, region: null };
    }
    setCargaPrecios({ clave: claveSolicitada, estado: 'loading', precios: new Map(), contexto: null, regionNombre: null, error: null });
    try {
      const lista = await descuentoEngineClient.listaSucursal(solicitada, regionSolicitada || null);
      if (!vigente()) throw new Error('El punto de venta o la región cambiaron. Actualizá la lista antes de exportar.');
      const nuevos: PreciosSucursal = new Map(lista.items.map((item) => [item.id, item]));
      const contexto = lista.contexto_monetario ?? null;
      const region = lista.region?.nombre ?? null;
      setCargaPrecios({ clave: claveSolicitada, estado: 'success', precios: nuevos, contexto, regionNombre: region, error: null });
      return { precios: nuevos, contexto, region };
    } catch (err) {
      if (vigente()) {
        setCargaPrecios({
          clave: claveSolicitada,
          estado: 'error',
          precios: new Map(),
          contexto: null,
          regionNombre: null,
          error: err instanceof Error ? err.message : 'No se pudieron calcular los descuentos.',
        });
      }
      throw err;
    }
  }, [sucursalId, sucursalValida, regionesListas, regionId, cotizacionSucursal.cargando, cotizacionSucursal.revision]);

  useEffect(() => {
    if (!sucursalId || !sucursalValida || !regionesListas || cotizacionSucursal.cargando) {
      requestPrecios.current++;
      return;
    }
    let vigente = true;
    void Promise.resolve().then(() => vigente ? cargarPrecios() : undefined).catch(() => undefined);
    return () => {
      vigente = false;
      requestPrecios.current++;
    };
  }, [sucursalId, sucursalValida, regionesListas, regionId, cotizacionSucursal.cargando, cargarPrecios, reintentoManual]);

  const cargaStockVigente = cargaStock.sucursalId === sucursalId && cargaStock.revision === cotizacionSucursal.revision ? cargaStock : ESTADO_STOCK_INICIAL;
  const cargaPreciosVigente = cargaPrecios.clave === clavePreciosActual ? cargaPrecios : ESTADO_PRECIOS_INICIAL;
  const stockDeSucursal = useMemo(
    () => sucursalValida && cargaStockVigente.estado === 'success'
      ? cargaStockVigente.items.filter((item) => item.sucursalId === sucursalId && item.activo)
      : [],
    [sucursalValida, cargaStockVigente, sucursalId]
  );
  const precios = useMemo(() => cargaPreciosVigente.estado === 'success' ? cargaPreciosVigente.precios : PRECIOS_VACIOS, [cargaPreciosVigente]);
  const contextoActualLista = cargaPreciosVigente.estado === 'success' ? cargaPreciosVigente.contexto : null;
  const preciosCompletos = stockDeSucursal.every((item) => precios.has(item.id));
  const contextoCompatible = Boolean(contextoActualLista) && stockDeSucursal.every((item) => mismoContexto(item.contextoMonetario, contextoActualLista));
  const datosIncompatibles = cargaStockVigente.estado === 'success' && cargaPreciosVigente.estado === 'success' &&
    (!contextoCompatible || !preciosCompletos);
  const claveIncompatible = JSON.stringify([
    sucursalId,
    regionId,
    claveContexto(contextoActualLista),
    stockDeSucursal.map((item) => `${item.id}:${claveContexto(item.contextoMonetario)}`).sort(),
    Array.from(precios.keys()).sort(),
  ]);

  useEffect(() => {
    if (!sucursalId || !datosIncompatibles || snapshotReintentado === claveIncompatible) return;
    void Promise.resolve().then(() => {
      setSnapshotReintentado(claveIncompatible);
      return Promise.all([recargar(), cargarPrecios()]);
    }).catch(() => undefined);
  }, [sucursalId, datosIncompatibles, claveIncompatible, snapshotReintentado, recargar, cargarPrecios]);

  const incompatibilidadTerminal = datosIncompatibles && snapshotReintentado === claveIncompatible;
  const listaPreparada = Boolean(
    sucursalValida && regionesListas && !cotizacionSucursal.cargando && !cotizacionSucursal.error &&
    cargaStockVigente.estado === 'success' && cargaPreciosVigente.estado === 'success' &&
    contextoCompatible && preciosCompletos
  );

  const sucursalOptions: SucursalOption[] = useMemo(
    () => sucursales
      .filter((sucursal) => sucursal.activo)
      .map((sucursal) => ({ value: sucursal.id, label: sucursal.nombre })),
    [sucursales]
  );
  const regionOptions: RegionOption[] = useMemo(
    () => [
      { value: '', label: 'Sin región' },
      ...(regionesListas
        ? regionesCarga.regiones.map((region) => ({ value: region.id, label: `${region.nombre} (${formatPorcentaje(region.descuento)})` }))
        : []),
    ],
    [regionesListas, regionesCarga.regiones]
  );

  const { setPage } = query;
  const onRegionChange = useCallback((value: string) => {
    if (value !== regionId) {
      requestPrecios.current++;
      setCargaPrecios({ clave: claveLista(sucursalId, value, cotizacionSucursal.revision), estado: 'idle', precios: PRECIOS_VACIOS, contexto: null, regionNombre: null, error: null });
      setSnapshotReintentado('');
    }
    sinRegionElegida.current = value === '';
    setRegionSeleccionada(value);
    setPage(1);
  }, [setPage, regionId, sucursalId, cotizacionSucursal.revision]);

  const onFilterChange = useCallback((campo: string, valor: string) => {
    if (campo === 'sucursal' && valor !== sucursalId) {
      requestStock.current++;
      requestPrecios.current++;
      requestRegiones.current++;
      const revision = cotizacionSucursal.revision;
      setCargaStock({ sucursalId: valor, revision, estado: 'idle', items: [], error: null });
      setCargaPrecios({ clave: claveLista(valor, '', revision), estado: 'idle', precios: PRECIOS_VACIOS, contexto: null, regionNombre: null, error: null });
      setRegionesCarga({ sucursalId: valor, estado: 'idle', regiones: [], error: null });
      setRegionSeleccionada('');
      sinRegionElegida.current = false;
      setSnapshotReintentado('');
    }
    // La región vive en el estado del hook (ligada a la carga de regiones del PDV), no en los filtros de tabla.
    if (campo === 'region') {
      onRegionChange(valor);
      return;
    }
    aplicarFiltroQuery(campo, valor);
  }, [aplicarFiltroQuery, onRegionChange, sucursalId, cotizacionSucursal.revision]);

  const itemsSucursal = useMemo(
    () => sucursalValida && cargaStockVigente.estado === 'success' ? stockDeSucursal : [],
    [sucursalValida, cargaStockVigente.estado, stockDeSucursal]
  );

  const filterOptions = useMemo(() => {
    const options: Record<string, { value: string; label: string }[]> = {
      sucursal: sucursalOptions,
      region: regionOptions,
    };
    FILTER_FIELDS.forEach((campo) => {
      const valores = Array.from(
        new Set(itemsSucursal.map((item) => String(getValor(item, campo, getSubtipoNombre, precios) ?? '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));
      options[campo] = valores.map((value) => ({ value, label: value }));
    });
    return options;
  }, [itemsSucursal, getSubtipoNombre, sucursalOptions, regionOptions, precios]);

  const aplicarSeleccion = useCallback((stock: StockItem[], preciosVista: PreciosSucursal, sucursalSolicitada = sucursalId) => {
    const q = query.search.trim().toLowerCase();
    const filtrados = stock.filter((item) => item.sucursalId === sucursalSolicitada && item.activo &&
      (!q || item.codigo.toLowerCase().includes(q) || item.nombre.toLowerCase().includes(q)) &&
      FILTER_FIELDS.every((campo) => !query.filters[campo] || String(getValor(item, campo, getSubtipoNombre, preciosVista)) === query.filters[campo]));
    return filtrados.sort((a, b) => {
      for (const { sortBy, sortDir } of query.sort) {
        const va = getValor(a, sortBy, getSubtipoNombre, preciosVista);
        const vb = getValor(b, sortBy, getSubtipoNombre, preciosVista);
        if (va == null || vb == null) { if (va !== vb) return va == null ? 1 : -1; continue; }
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
        if (cmp) return sortDir === 'asc' ? cmp : -cmp;
      }
      return a.id.localeCompare(b.id);
    });
  }, [query.search, query.filters, query.sort, sucursalId, getSubtipoNombre]);

  const revalidarAcceso = useCallback(async () => {
    const solicitado = sucursalId;
    const regionSolicitada = regionId;
    const revisionSolicitada = cotizacionSucursal.revision;
    const id = ++requestAcceso.current;
    if (!solicitado || !sucursalValida) throw new Error('Seleccioná un punto de venta activo dentro de tu alcance antes de exportar.');
    try {
      const reciente = await descuentoEngineClient.listaSucursal(solicitado, regionSolicitada || null);
      if (id !== requestAcceso.current || sucursalActual.current !== solicitado || regionActual.current !== regionSolicitada || revisionActual.current !== revisionSolicitada || !sucursalValidaActual.current) {
        throw new Error('El punto de venta o la región cambiaron. Actualizá la lista antes de exportar.');
      }
      if (reciente.sucursal.id !== solicitado) throw new Error('La respuesta no corresponde al punto de venta seleccionado.');
      if ((reciente.region?.id ?? '') !== regionSolicitada) throw new Error('La lista no corresponde a la región seleccionada.');
    } catch (err) {
      if (id === requestAcceso.current && sucursalActual.current === solicitado && regionActual.current === regionSolicitada && revisionActual.current === revisionSolicitada) {
        requestStock.current++;
        requestPrecios.current++;
        setCargaStock({ sucursalId: solicitado, revision: revisionSolicitada, estado: 'idle', items: [], error: null });
        setCargaPrecios({
          clave: claveLista(solicitado, regionSolicitada, revisionSolicitada),
          estado: 'error',
          precios: new Map(),
          contexto: null,
          regionNombre: null,
          error: err instanceof Error ? err.message : 'La lista ya no está disponible.',
        });
      }
      throw err;
    }
  }, [sucursalId, sucursalValida, regionId, cotizacionSucursal.revision]);

  const actualizarSeleccion = async () => {
    const solicitada = sucursalId;
    const regionSolicitada = regionId;
    const revisionSolicitada = cotizacionSucursal.revision;
    if (!solicitada || !sucursalValida) throw new Error('Seleccioná un punto de venta activo dentro de tu alcance antes de actualizar la lista.');
    if (!regionesListas) throw new Error(errorRegiones ?? 'Esperá a que carguen las regiones del punto de venta.');
    if (cotizacionSucursal.cargando) throw new Error('Esperá a que termine la actualización de la cotización.');
    const generacionStock = requestStock.current + 1;
    const generacionPrecios = requestPrecios.current + 1;
    const [stock, resultado] = await Promise.all([recargar(), cargarPrecios()]);
    if (requestStock.current !== generacionStock || requestPrecios.current !== generacionPrecios ||
      sucursalActual.current !== solicitada || regionActual.current !== regionSolicitada || revisionActual.current !== revisionSolicitada || !sucursalValidaActual.current) {
      throw new Error('El punto de venta o la región cambiaron. Actualizá la lista antes de exportar.');
    }
    const filasSucursal = stock.filter((item) => item.sucursalId === solicitada && item.activo);
    if (!resultado.contexto || !filasSucursal.every((item) => mismoContexto(item.contextoMonetario, resultado.contexto))) {
      throw new Error('La cotización cambió durante la actualización. Volvé a actualizar la lista antes de exportar.');
    }
    if (!filasSucursal.every((item) => resultado.precios.has(item.id))) {
      throw new Error('La lista calculada está incompleta. Reintentá antes de exportar.');
    }
    return {
      items: aplicarSeleccion(stock, resultado.precios, solicitada),
      precios: resultado.precios,
      contexto: resultado.contexto,
      regionNombre: resultado.region,
      sucursalId: solicitada,
      regionId: regionSolicitada,
      sucursalNombre: sucursales.find((sucursal) => sucursal.id === solicitada)?.nombre ?? '',
    };
  };

  const reintentar = useCallback(() => {
    if (!sucursalId || !sucursalValida) return;
    setSnapshotReintentado('');
    requestRegiones.current++;
    requestStock.current++;
    requestPrecios.current++;
    setRegionesCarga({ sucursalId, estado: 'loading', regiones: [], error: null });
    setCargaStock({ sucursalId, revision: cotizacionSucursal.revision, estado: 'idle', items: [], error: null });
    setCargaPrecios({ clave: claveLista(sucursalId, regionId, cotizacionSucursal.revision), estado: 'idle', precios: PRECIOS_VACIOS, contexto: null, regionNombre: null, error: null });
    // La región elegida se conserva si sigue vigente cuando vuelvan a cargar las regiones.
    setReintentoManual((actual) => actual + 1);
  }, [sucursalId, sucursalValida, regionId, cotizacionSucursal.revision]);

  const incompatibilidadPendiente = datosIncompatibles && snapshotReintentado !== claveIncompatible;
  const isLoading = Boolean(sucursalId && sucursalValida && (
    cotizacionSucursal.cargando ||
    regionesCarga.sucursalId !== sucursalId || regionesCarga.estado === 'idle' || regionesCarga.estado === 'loading' ||
    cargaStockVigente.estado === 'idle' || cargaStockVigente.estado === 'loading' ||
    (regionesListas && (cargaPreciosVigente.estado === 'idle' || cargaPreciosVigente.estado === 'loading')) ||
    incompatibilidadPendiente
  ));
  const error = !sucursalId ? null
    : !sucursalValida ? 'Seleccioná un punto de venta activo dentro de tu alcance.'
      : cargaStockVigente.estado === 'error' ? cargaStockVigente.error
        : errorRegiones
          ?? (cargaPreciosVigente.estado === 'error' ? cargaPreciosVigente.error : null)
          ?? cotizacionSucursal.error
          ?? (incompatibilidadTerminal ? 'Stock y precios calculados tienen contextos distintos o faltan precios. Reintentá la lista.' : null);

  const items = useMemo(
    () => listaPreparada ? aplicarSeleccion(stockDeSucursal, precios) : [],
    [listaPreparada, aplicarSeleccion, stockDeSucursal, precios]
  );
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (query.page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, query.page]);

  return {
    sucursalId,
    actualizarSeleccion,
    revalidarAcceso,
    reintentar,
    puedeExportar: listaPreparada && items.length > 0,
    contexto: listaPreparada ? contextoActualLista : null,
    error,
    precios: listaPreparada ? precios : PRECIOS_VACIOS,
    sucursalOptions,
    regionId,
    regionOptions,
    onRegionChange,
    /** Región con la que se calcularon los precios mostrados (para exportar). */
    regionNombre: listaPreparada ? cargaPreciosVigente.regionNombre : null,
    regionesDisponibles: regionesListas ? regionesCarga.regiones.length : 0,
    cargandoRegiones: Boolean(sucursalId && sucursalValida && (regionesCargaVigente.estado === 'idle' || regionesCargaVigente.estado === 'loading')),
    items,
    pageItems,
    ...query,
    page: Math.min(query.page, totalPages),
    totalPages,
    isLoading,
    sucursalNombre,
    filterOptions,
    onFilterChange,
  };
}
