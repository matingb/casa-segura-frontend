'use client';
import { useState } from 'react';
import { ContextoMonetario, PrecioResuelto } from '../types/Moneda';
import { PrecioEdicion } from '../utils/precio';
export function usePrecioEdicion(source: { precio?: PrecioResuelto; contextoMonetario?: ContextoMonetario; precioBase?: number | null; precioVentaArs?: number | null } | undefined) {
  const inicial = (): PrecioEdicion => ({ moneda: source?.precio?.moneda_referencia ?? 'ARS',
    importe: source?.precio ? source.precio.importe_referencia ?? ''
      : (source && 'precioVentaArs' in source ? source.precioVentaArs : source?.precioBase)?.toString() ?? '',
    contexto: source?.contextoMonetario ?? null, cambiado: false });
  const [edicion, setEdicion] = useState(() => ({ source, precio: inicial() }));
  // Un nuevo detalle restablece el formulario; una cotización nueva conserva
  // el borrador porque no reemplaza el objeto source.
  const precio = edicion.source === source ? edicion.precio : inicial();
  if (edicion.source !== source) setEdicion({ source, precio });
  const setPrecio = (nuevo: PrecioEdicion) => setEdicion({ source, precio: nuevo });
  return { precio, setPrecio, resetPrecio: () => setPrecio(inicial()) };
}
