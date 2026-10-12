'use client';
import { useState } from 'react';
import { ContextoMonetario, PrecioResuelto } from '../types/Moneda';
import { PrecioEdicion } from '../utils/precio';

/**
 * Borrador de un monto con moneda de referencia (precio o costo). `source` es
 * el objeto cargado: un nuevo detalle restablece el borrador; una cotización
 * nueva lo conserva porque no reemplaza el objeto source.
 */
export function useMontoEdicion(source: object | undefined, resuelto: PrecioResuelto | undefined,
  arsLegado: number | null | undefined, contexto: ContextoMonetario | undefined) {
  const inicial = (): PrecioEdicion => ({ moneda: resuelto?.moneda_referencia ?? 'ARS',
    importe: resuelto ? resuelto.importe_referencia ?? '' : arsLegado?.toString() ?? '',
    contexto: contexto ?? null, cambiado: false });
  const [edicion, setEdicion] = useState(() => ({ source, monto: inicial() }));
  const monto = edicion.source === source ? edicion.monto : inicial();
  if (edicion.source !== source) setEdicion({ source, monto });
  const setMonto = (nuevo: PrecioEdicion) => setEdicion({ source, monto: nuevo });
  return { monto, setMonto, resetMonto: () => setMonto(inicial()) };
}

export function usePrecioEdicion(source: { precio?: PrecioResuelto; contextoMonetario?: ContextoMonetario; precioBase?: number | null; precioVentaArs?: number | null } | undefined) {
  const arsLegado = source && 'precioVentaArs' in source ? source.precioVentaArs : source?.precioBase;
  const { monto, setMonto, resetMonto } = useMontoEdicion(source, source?.precio, arsLegado, source?.contextoMonetario);
  return { precio: monto, setPrecio: setMonto, resetPrecio: resetMonto };
}
