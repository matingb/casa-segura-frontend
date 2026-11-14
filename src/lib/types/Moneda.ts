export type Moneda = 'ARS' | 'USD';
export interface ContextoMonetario {
  cotizacion_usd_ars: string | null;
  cotizacion_version: string;
  actualizada_at: string | null;
  origen?: 'TENANT' | 'SUCURSAL';
  sucursal_id?: string | null;
  sucursal_nombre?: string | null;
  actualizada_por?: string | null;
  actualizada_por_nombre?: string | null;
}
export interface PrecioResuelto {
  moneda_referencia: Moneda;
  importe_referencia: string | null;
  ars: string | null;
  usd: string | null;
  estado: 'VINCULADO' | 'SIN_PRECIO' | 'SIN_COTIZACION' | 'LEGADO_PENDIENTE_REVISION';
}
export interface PrecioInput {
  moneda_referencia: Moneda;
  importe_referencia: string | null;
  cotizacion_version: string;
}
export interface Cotizacion extends ContextoMonetario {
  puede_actualizar: boolean;
  sugerencias_sucursales: Array<{ id: string; nombre: string; valor_dolar: string | null }>;
}

export function cotizacionCambio(a: Cotizacion, b: Cotizacion): boolean {
  return (
    a.cotizacion_usd_ars !== b.cotizacion_usd_ars ||
    a.cotizacion_version !== b.cotizacion_version ||
    a.origen !== b.origen ||
    a.sucursal_id !== b.sucursal_id
  );
}
