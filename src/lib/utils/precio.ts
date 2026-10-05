import Decimal from 'decimal.js';
import { ContextoMonetario, Moneda, PrecioInput, PrecioResuelto } from '../types/Moneda';
import { CatalogoApiError } from '../api/cotizacion.client';
export const Dinero = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export function resolverPrecioVista(moneda: Moneda, importe: string | null, contexto: ContextoMonetario | null): PrecioResuelto {
  const vacio: PrecioResuelto = { moneda_referencia: moneda, importe_referencia: importe, ars: null, usd: null, estado: 'SIN_PRECIO' };
  if (importe === null || importe === '' || !/^\d+(?:\.\d+)?$/.test(importe)) return vacio;
  const principal = new Dinero(importe);
  const tasa = contexto?.cotizacion_usd_ars ? new Dinero(contexto.cotizacion_usd_ars) : null;
  return { ...vacio, importe_referencia: principal.toFixed(moneda === 'ARS' ? 2 : 4),
    ars: moneda === 'ARS' ? principal.toFixed(2) : tasa?.gt(0) ? principal.times(tasa).toFixed(2) : null,
    usd: moneda === 'USD' ? principal.toFixed(4) : tasa?.gt(0) ? principal.div(tasa).toFixed(4) : null,
    estado: tasa?.gt(0) ? 'VINCULADO' : 'SIN_COTIZACION' };
}
export interface PrecioEdicion { moneda: Moneda; importe: string; contexto: ContextoMonetario | null; cambiado: boolean }
export function precioParaGuardar(edicion: PrecioEdicion, vigente: ContextoMonetario | null): PrecioInput | null | undefined {
  if (!edicion.cambiado) return undefined;
  if (edicion.importe.trim() === '') return null;
  if (!vigente?.cotizacion_usd_ars) throw new CatalogoApiError('Configurá el valor del dólar antes de guardar el precio.', 'COTIZACION_REQUERIDA');
  if (edicion.contexto?.cotizacion_version !== vigente.cotizacion_version) throw new CatalogoApiError('Cambió la cotización. Actualizá la previsualización y revisá el precio.', 'COTIZACION_CAMBIO', 409);
  const escala = edicion.moneda === 'ARS' ? 2 : 4;
  if (!/^\d+(?:\.\d+)?$/.test(edicion.importe) || new Dinero(edicion.importe).decimalPlaces() > escala) throw new Error(`El precio ${edicion.moneda} admite hasta ${escala} decimales y debe ser positivo o cero.`);
  return { moneda_referencia: edicion.moneda, importe_referencia: edicion.importe, cotizacion_version: vigente.cotizacion_version };
}
