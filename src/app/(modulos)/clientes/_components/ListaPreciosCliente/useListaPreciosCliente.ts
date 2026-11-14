'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { descuentoEngineClient } from '../../../../../lib/api/descuento-engine.client';
import { CatalogoApiError } from '../../../../../lib/api/apiError';
import { ItemConMargenCalculado, ListaPreciosCliente } from '../../../../../lib/types/ListaPreciosCliente';
import { useCotizacionSucursal } from '../../../../../lib/hooks/useCotizacionSucursal';

export const esPendienteRevision = (item: ItemConMargenCalculado) => item.estadoPrecio === 'LEGADO_PENDIENTE_REVISION';
/** Con precio de lista $ 0 el cálculo no aplica el mínimo: el problema es el precio, no el descuento. */
export const tienePrecioCero = (item: ItemConMargenCalculado) => !(Number(item.precioListaArs) > 0);
export const ajustadoAlMinimo = (item: ItemConMargenCalculado) => item.noAlcanzaMargen && !tienePrecioCero(item);

export interface ListaClienteNoDisponible {
  clienteId: string;
  sucursalId: string;
  generation: number;
  origen: 'lista' | 'revalidacion' | 'descuentos';
}

let siguienteGeneracionNotificacion = 0;
export function nuevaGeneracionNotificacionListaCliente() {
  return ++siguienteGeneracionNotificacion;
}

/**
 * Carga la lista final del cliente. La disponibilidad comercial, la visibilidad
 * del consumidor y la selección del PDV son condiciones independientes.
 */
export function useListaPreciosCliente({
  clienteId,
  sucursales,
  clienteActivo = true,
  activo = true,
  onRecursoNoDisponible,
}: {
  clienteId: string;
  sucursales: Array<{ id: string; nombre: string }>;
  clienteActivo?: boolean;
  /** Habilitación de carga (por ejemplo, pestaña visible o modal abierto). */
  activo?: boolean;
  onRecursoNoDisponible?: (detalle: ListaClienteNoDisponible) => void | Promise<void>;
}) {
  const [sucursalElegida, setSucursalElegida] = useState<string | null>(null);
  const sucursalPorDefecto = sucursales[0]?.id ?? '';
  const idsAlcanzablesKey = useMemo(() => sucursales.map((sucursal) => sucursal.id).sort().join('|'), [sucursales]);
  const idsDisponibles = useMemo(() => new Set(idsAlcanzablesKey ? idsAlcanzablesKey.split('|') : []), [idsAlcanzablesKey]);
  const sucursalId = sucursalElegida === null ? sucursalPorDefecto : idsDisponibles.has(sucursalElegida) ? sucursalElegida : '';
  const idsAlcanzables = useRef(new Set<string>());
  const clienteActual = useRef(clienteId);
  const contextoRef = useRef('');
  const cargaHabilitada = Boolean(activo && clienteActivo && clienteId && sucursalId && idsDisponibles.has(sucursalId));

  const cotizacion = useCotizacionSucursal(cargaHabilitada ? sucursalId : null);
  const cotizacionInicialPendiente = cargaHabilitada && cotizacion.revision === 0 && cotizacion.cargando;
  const [datos, setDatos] = useState<ListaPreciosCliente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const request = useRef(0);
  const accessRequest = useRef(0);
  const recargaEnCurso = useRef<{ contexto: string; promesa: Promise<ListaPreciosCliente> } | null>(null);
  const datosRef = useRef<ListaPreciosCliente | null>(null);
  const generacionesDeDatos = useRef(new WeakMap<ListaPreciosCliente, number>());
  const cargaActual = useRef(cargaHabilitada);
  const sucursalActual = useRef(sucursalId);

  useEffect(() => {
    idsAlcanzables.current = idsDisponibles;
    clienteActual.current = clienteId;
    contextoRef.current = `${cargaHabilitada}|${clienteActivo}|${clienteId}|${sucursalId}`;
    cargaActual.current = cargaHabilitada;
    sucursalActual.current = sucursalId;
  }, [idsDisponibles, clienteId, cargaHabilitada, clienteActivo, sucursalId]);

  // Una selección retirada se deriva como vacía; no se cambia automáticamente
  // a otro PDV ni se publica su antiguo snapshot.
  useEffect(() => {
    if (sucursalElegida && !idsDisponibles.has(sucursalElegida)) {
      request.current++;
      recargaEnCurso.current = null;
    }
  }, [sucursalElegida, idsDisponibles]);

  const notificarNoDisponible = useCallback((generation: number, origen: ListaClienteNoDisponible['origen']) => {
    if (!onRecursoNoDisponible) return;
    void Promise.resolve(onRecursoNoDisponible({ clienteId, sucursalId, generation, origen })).catch(() => undefined);
  }, [clienteId, sucursalId, onRecursoNoDisponible]);

  const recargar = useCallback(() => {
    const sucursalSolicitada = sucursalId;
    const contextoSolicitado = `${cargaHabilitada}|${clienteActivo}|${clienteId}|${sucursalSolicitada}`;
    if (!cargaHabilitada) {
      request.current++;
      recargaEnCurso.current = null;
      datosRef.current = null;
      setDatos(null);
      setError(clienteActivo ? null : 'El cliente está inactivo. Reactivalo para consultar o exportar su lista de precios.');
      setCargando(false);
      return Promise.reject(new Error(clienteActivo
        ? 'No hay un punto de venta activo del cliente dentro de tu alcance.'
        : 'El cliente está inactivo. Reactivalo para consultar o exportar su lista de precios.'));
    }
    if (cotizacionInicialPendiente) return Promise.reject(new Error('Esperá a que termine la actualización de la cotización.'));
    if (recargaEnCurso.current?.contexto === contextoSolicitado) return recargaEnCurso.current.promesa;

    const id = ++request.current;
    const vigente = () => id === request.current && contextoRef.current === contextoSolicitado && clienteActual.current === clienteId;
    datosRef.current = null;
    setDatos(null);
    setError(null);
    setCargando(true);
    const promesa = (async () => {
      try {
        const data = await descuentoEngineClient.listaCliente(sucursalSolicitada, clienteId);
        if (!vigente()) throw new Error('El cliente o punto de venta cambió. Actualizá la lista antes de exportar.');
        if (data.cliente.id !== clienteId || data.sucursal.id !== sucursalSolicitada) {
          throw new Error('La respuesta no corresponde al cliente y punto de venta seleccionados.');
        }
        datosRef.current = data;
        generacionesDeDatos.current.set(data, id);
        setDatos(data);
        setError(null);
        return data;
      } catch (err) {
        if (vigente()) {
          datosRef.current = null;
          setDatos(null);
          setError(err instanceof Error ? err.message : 'No se pudo actualizar la lista.');
          if (err instanceof CatalogoApiError && (err.code === 'RECURSO_NO_DISPONIBLE' || err.status === 404)) {
            notificarNoDisponible(nuevaGeneracionNotificacionListaCliente(), 'lista');
          }
        }
        throw err;
      } finally {
        if (id === request.current) setCargando(false);
      }
    })();
    recargaEnCurso.current = { contexto: contextoSolicitado, promesa };
    void promesa.finally(() => {
      if (recargaEnCurso.current?.promesa === promesa) recargaEnCurso.current = null;
    }).catch(() => undefined);
    return promesa;
  }, [sucursalId, cargaHabilitada, clienteActivo, clienteId, cotizacionInicialPendiente, notificarNoDisponible]);

  useEffect(() => {
    if (!cargaHabilitada) {
      request.current++;
      recargaEnCurso.current = null;
      return;
    }
    // Esperar la primera lectura de cotización evita iniciar un cálculo que
    // quedaría obsoleto en cuanto llegue su primera revisión.
    if (cotizacionInicialPendiente) return;
    let vigente = true;
    void Promise.resolve().then(() => vigente ? recargar() : undefined).catch(() => undefined);
    return () => {
      vigente = false;
      request.current++;
      recargaEnCurso.current = null;
    };
  }, [cargaHabilitada, clienteActivo, activo, sucursalId, cotizacion.revision, cotizacionInicialPendiente, recargar]);

  const revalidarAcceso = useCallback(async () => {
    const id = ++accessRequest.current;
    const generation = request.current;
    const sucursalSolicitada = sucursalId;
    const contextoSolicitado = `${cargaHabilitada}|${clienteActivo}|${clienteId}|${sucursalSolicitada}`;
    const vigente = () => id === accessRequest.current && generation === request.current && contextoRef.current === contextoSolicitado;
    if (!cargaHabilitada) throw new Error('La lista no está disponible para este cliente y punto de venta.');
    try {
      const reciente = await descuentoEngineClient.listaCliente(sucursalSolicitada, clienteId);
      if (!vigente()) throw new Error('El cliente o punto de venta cambió. Actualizá la lista antes de exportar.');
      if (reciente.cliente.id !== clienteId || reciente.sucursal.id !== sucursalSolicitada) {
        throw new Error('La lista de precios ya no está disponible para este cliente y punto de venta.');
      }
      return reciente;
    } catch (err) {
      if (vigente()) {
        datosRef.current = null;
        setDatos(null);
        setError(err instanceof Error ? err.message : 'La lista ya no está disponible.');
        if (err instanceof CatalogoApiError && (err.code === 'RECURSO_NO_DISPONIBLE' || err.status === 404)) {
          notificarNoDisponible(nuevaGeneracionNotificacionListaCliente(), 'revalidacion');
        }
      }
      throw err;
    }
  }, [cargaHabilitada, clienteActivo, clienteId, sucursalId, notificarNoDisponible]);

  const sucursalAlcanzable = Boolean(sucursalId && idsDisponibles.has(sucursalId));
  const datosVisibles = cargaHabilitada && sucursalAlcanzable && datos?.sucursal.id === sucursalId && datos.cliente.id === clienteId ? datos : null;
  const items = useMemo(() => datosVisibles?.items ?? [], [datosVisibles]);

  const filtrar = useCallback((lista: ItemConMargenCalculado[]) => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter(item =>
      (!soloPendientes || esPendienteRevision(item)) &&
      (!q || [item.codigo, item.nombre, item.marca, item.modelo, item.subtipoNombre].some(v => v?.toLowerCase().includes(q))));
  }, [busqueda, soloPendientes]);

  const itemsFiltrados = useMemo(() => filtrar(items), [filtrar, items]);
  const pendientes = useMemo(() => items.filter(esPendienteRevision).length, [items]);
  const preciosEnCero = useMemo(() => items.filter(tienePrecioCero).length, [items]);
  const contexto = datosVisibles?.contexto_monetario ?? null;
  const setSucursalId = useCallback((id: string) => {
    if (id !== sucursalActual.current) {
      request.current++;
      recargaEnCurso.current = null;
      datosRef.current = null;
      setDatos(null);
      setError(null);
      setCargando(false);
    }
    setSucursalElegida(id);
  }, []);
  const esSnapshotVigente = useCallback((snapshot: ListaPreciosCliente | null | undefined) => {
    if (!snapshot) return false;
    const generation = generacionesDeDatos.current.get(snapshot);
    return generation !== undefined && generation === request.current && datosRef.current === snapshot &&
      cargaActual.current && clienteActual.current === snapshot.cliente.id && sucursalActual.current === snapshot.sucursal.id;
  }, []);

  return {
    sucursalId, setSucursalId, datos: datosVisibles, disponible: datosVisibles !== null,
    esSnapshotVigente,
    items, itemsFiltrados, filtrar, revalidarAcceso,
    cargando: cargaHabilitada && (cotizacionInicialPendiente || cargando),
    error: !clienteActivo ? 'El cliente está inactivo. Reactivalo para consultar o exportar su lista de precios.'
      : error ?? (!sucursalAlcanzable && sucursalElegida ? 'El punto de venta ya no está disponible dentro de tu alcance.' : null),
    recargar, busqueda, setBusqueda,
    soloPendientes: soloPendientes && pendientes > 0, setSoloPendientes,
    filtroActivo: busqueda.trim() !== '' || (soloPendientes && pendientes > 0),
    pendientes, preciosEnCero, contexto,
    hayCotizacion: contexto?.cotizacion_usd_ars != null,
    sinDescuentos: items.length > 0 && items.every(item => !(item.descuentoTotalPorcentaje > 0)),
  };
}

export type ListaPreciosClienteEstado = ReturnType<typeof useListaPreciosCliente>;
