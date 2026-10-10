'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { descuentoEngineClient } from '../../../../../lib/api/descuento-engine.client';
import { ItemConMargenCalculado, ListaPreciosCliente } from '../../../../../lib/types/ListaPreciosCliente';
import { useCotizacion } from '../../../../../context/CotizacionContext';

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
  const { revision } = useCotizacion();
  const [sucursalElegida, setSucursalElegida] = useState('');
  const sucursalId = sucursalElegida || sucursales[0]?.id || '';
  const [datos, setDatos] = useState<ListaPreciosCliente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const request = useRef(0);

  const recargar = useCallback(async () => {
    const id = ++request.current;
    setCargando(true);
    setDatos(prev => prev?.sucursal.id === sucursalId && prev.cliente.id === clienteId ? prev : null);
    try {
      const data = await descuentoEngineClient.listaCliente(sucursalId, clienteId);
      if (id === request.current) { setDatos(data); setError(null); }
      return data;
    } catch (err) {
      if (id === request.current) setError(err instanceof Error ? err.message : 'No se pudo actualizar la lista.');
      throw err;
    } finally {
      if (id === request.current) setCargando(false);
    }
  }, [sucursalId, clienteId]);

  useEffect(() => {
    if (!activo || !clienteId || !sucursalId) return;
    let vigente = true;
    const contador = request;
    void Promise.resolve().then(() => vigente ? recargar() : undefined).catch(() => {});
    return () => { vigente = false; contador.current++; };
  }, [activo, clienteId, sucursalId, revision, recargar]);

  const items = useMemo(
    () => datos?.sucursal.id === sucursalId && datos.cliente.id === clienteId ? datos.items : [],
    [datos, sucursalId, clienteId],
  );

  const filtrar = useCallback((lista: ItemConMargenCalculado[]) => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter(item =>
      (!soloPendientes || esPendienteRevision(item)) &&
      (!q || [item.codigo, item.nombre, item.marca, item.modelo, item.subtipoNombre].some(v => v?.toLowerCase().includes(q))));
  }, [busqueda, soloPendientes]);

  const itemsFiltrados = useMemo(() => filtrar(items), [filtrar, items]);
  const pendientes = useMemo(() => items.filter(esPendienteRevision).length, [items]);
  const preciosEnCero = useMemo(() => items.filter(tienePrecioCero).length, [items]);
  const contexto = datos?.contexto_monetario ?? null;

  return {
    sucursalId, setSucursalId: setSucursalElegida, datos, items, itemsFiltrados, filtrar,
    cargando, error, recargar, busqueda, setBusqueda,
    soloPendientes: soloPendientes && pendientes > 0, setSoloPendientes,
    filtroActivo: busqueda.trim() !== '' || (soloPendientes && pendientes > 0),
    pendientes, preciosEnCero, contexto,
    hayCotizacion: contexto?.cotizacion_usd_ars != null,
    sinDescuentos: items.length > 0 && items.every(item => !(item.descuentoTotalPorcentaje > 0)),
  };
}

export type ListaPreciosClienteEstado = ReturnType<typeof useListaPreciosCliente>;
