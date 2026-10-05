import { ContextoMonetario } from '../types/Moneda';
import { formatFecha } from './formatters';
import { Dinero } from './precio';
export function fechaArchivoBuenosAires(fecha = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}
export function numeroExcel(valor: number | string | null | undefined): number | string {
  if (valor == null) return '';
  const decimal = new Dinero(valor);
  // Excel conserva 15 cifras significativas. Un valor mayor se conserva como texto.
  return decimal.precision() <= 15 ? decimal.toNumber() : decimal.toString();
}
export function metadatosPrecios(contexto: ContextoMonetario | null | undefined, legado: boolean, sucursal: string, cliente?: string) {
  return [ ['Origen', cliente ? 'Precios de sucursal con descuentos del cliente' : 'Precios de sucursal sin descuentos de cliente'],
    ['Sucursal', sucursal], ...(cliente ? [['Cliente', cliente]] : []),
    ['1 USD = ARS', contexto?.cotizacion_usd_ars ?? 'Sin cotización: equivalente USD no disponible'],
    ['Versión de cotización', contexto?.cotizacion_version ?? '0'],
    ['Cotización actualizada', formatFecha(contexto?.actualizada_at ?? '')],
    ['Generado (America/Buenos_Aires)', formatFecha(new Date().toISOString())],
    ['Precisión', 'ARS 2 decimales · USD 4 decimales · cotización 6 decimales'],
    ['Revisión', legado ? 'Incluye precios heredados pendientes de confirmación; referencia ARS provisional.' : 'Precios con referencia declarada'],
  ];
}
export function validarSnapshotPrecios(contextos: Array<ContextoMonetario | undefined>, contexto: ContextoMonetario | null | undefined) {
  if (contextos.some(c => c && (c.cotizacion_version !== contexto?.cotizacion_version || c.cotizacion_usd_ars !== contexto?.cotizacion_usd_ars))) throw new Error('La lista contiene cotizaciones diferentes. Recargá antes de exportar.');
}
