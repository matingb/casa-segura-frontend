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

/**
 * Carga la lista de precios final del cliente (mismo endpoint que usa la exportación)
 * y concentra los filtros de pantalla para que la tabla y los archivos vean lo mismo.
 */
export function useListaPreciosCliente({ clienteId, sucursales, activo = true }: {
  clienteId: string;
  sucursales: Array<{ id: string; nombre: string }>;
  activo?: boolean;
}) {
  const [sucursalElegida, setSucursalElegida] = useState('');
  const sucursalId = sucursalElegida || sucursales[0]?.id || '';
  const { revision } = useCotizacionSucursal(sucursalId);
  const [datos, setDatos] = useState<ListaPreciosCliente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const request = useRef(0);
  const contextoRef = useRef('');
  contextoRef.current = `${activo}|${clienteId}|${sucursalId}`;

  useEffect(() => {
    if (sucursalElegida && !sucursales.some((sucursal) => sucursal.id === sucursalElegida)) {
      setSucursalElegida('');
    }
  }, [sucursalElegida, sucursales]);

  const recargar = useCallback(async () => {
    const id = ++request.current;
    const sucursalSolicitada = sucursalId;
    const contextoSolicitado = `${activo}|${clienteId}|${sucursalSolicitada}`;
    if (!activo || !clienteId || !sucursalSolicitada || !sucursales.some((sucursal) => sucursal.id === sucursalSolicitada)) {
      setDatos(null);
      setError(null);
      setCargando(false);
      throw new Error('El cliente ya no tiene un punto de venta activo dentro de tu alcance.');
    }
    setDatos(null);
    setError(null);
    setCargando(true);
    try {
      const data = await descuentoEngineClient.listaCliente(sucursalSolicitada, clienteId);
      if (id !== request.current || contextoRef.current !== contextoSolicitado) {
        throw new Error('El cliente o punto de venta cambió. Actualizá la lista antes de exportar.');
      }
      if (id === request.current && contextoRef.current === contextoSolicitado) { setDatos(data); setError(null); }
      return data;
    } catch (err) {
      if (id === request.current && contextoRef.current === contextoSolicitado) {
        setDatos(null);
        setError(err instanceof Error ? err.message : 'No se pudo actualizar la lista.');
        if (err instanceof CatalogoApiError && err.code === 'RECURSO_NO_DISPONIBLE') {
          window.dispatchEvent(new CustomEvent('alcance-pdv-revocado'));
        }
      }
      throw err;
    } finally {
      if (id === request.current) setCargando(false);
    }
  }, [sucursalId, clienteId, sucursales, activo]);

  useEffect(() => {
    if (!activo || !clienteId || !sucursalId) {
      request.current++;
      setDatos(null);
      setCargando(false);
      setError(null);
      return;
    }
    let vigente = true;
    const contador = request;
    void Promise.resolve().then(() => vigente ? recargar() : undefined).catch(() => {});
    return () => { vigente = false; contador.current++; };
  }, [activo, clienteId, sucursalId, revision, recargar]);

  const revalidarAcceso = useCallback(async () => {
    const contextoSolicitado = `${activo}|${clienteId}|${sucursalId}`;
    if (!activo || !clienteId || !sucursalId || !sucursales.some((sucursal) => sucursal.id === sucursalId)) {
      throw new Error('El cliente ya no tiene un punto de venta activo dentro de tu alcance.');
    }
    let reciente: ListaPreciosCliente;
    try {
      reciente = await descuentoEngineClient.listaCliente(sucursalId, clienteId);
    } catch (err) {
      if (contextoRef.current === contextoSolicitado) {
        setDatos(null);
        setError(err instanceof Error ? err.message : 'La lista ya no está disponible.');
        if (err instanceof CatalogoApiError && err.code === 'RECURSO_NO_DISPONIBLE') {
          window.dispatchEvent(new CustomEvent('alcance-pdv-revocado'));
        }
      }
      throw err;
    }
    if (contextoRef.current !== contextoSolicitado) {
      throw new Error('El cliente o punto de venta cambió. Actualizá la lista antes de exportar.');
    }
    if (reciente.cliente.id !== clienteId || reciente.sucursal.id !== sucursalId) {
      setDatos(null);
      setError('La lista de precios ya no está disponible para este cliente y punto de venta.');
      throw new Error('La lista de precios ya no está disponible para este cliente y punto de venta.');
    }
    if (sucursalElegida && !sucursales.some((sucursal) => sucursal.id === sucursalElegida)) {
      throw new Error('El punto de venta cambió. Actualizá la lista antes de exportar.');
    }
  }, [activo, clienteId, sucursalId, sucursales, sucursalElegida]);

  const sucursalAlcanzable = sucursales.some((sucursal) => sucursal.id === sucursalId);
  const datosVisibles = sucursalAlcanzable && datos?.sucursal.id === sucursalId && datos.cliente.id === clienteId ? datos : null;
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

  return {
    sucursalId, setSucursalId: setSucursalElegida, datos: datosVisibles, items, itemsFiltrados, filtrar, revalidarAcceso,
    cargando, error: error ?? (!sucursalAlcanzable && sucursalId ? 'El punto de venta ya no está disponible dentro de tu alcance.' : null), recargar, busqueda, setBusqueda,
    soloPendientes: soloPendientes && pendientes > 0, setSoloPendientes,
    filtroActivo: busqueda.trim() !== '' || (soloPendientes && pendientes > 0),
    pendientes, preciosEnCero, contexto,
    hayCotizacion: contexto?.cotizacion_usd_ars != null,
    sinDescuentos: items.length > 0 && items.every(item => !(item.descuentoTotalPorcentaje > 0)),
  };
}

export type ListaPreciosClienteEstado = ReturnType<typeof useListaPreciosCliente>;
