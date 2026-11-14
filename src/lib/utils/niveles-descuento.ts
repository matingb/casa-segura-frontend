import { AporteDescuentoLista, NivelDescuentoLista } from '../types/ListaPreciosCliente';
import { formatPorcentaje } from './formatters';

/** Nombres simples de cada nivel del cálculo, en el orden en que se aplican. */
const NIVELES: Record<NivelDescuentoLista, { corto: string; descripcion: string; catalogo: string; largo: string }> = {
  sucursal: { corto: 'Sucursal', descripcion: 'Sucursal', catalogo: 'Sucursal', largo: 'Descuento de la sucursal' },
  categoria: { corto: 'Categoría', descripcion: 'Categoría', catalogo: 'Categoría general', largo: 'Descuento general de la categoría' },
  producto: { corto: 'Producto', descripcion: 'Producto', catalogo: 'Producto general', largo: 'Descuento general del producto (para todos los clientes)' },
  'region-cliente': { corto: 'Región', descripcion: 'Región', catalogo: 'Región', largo: 'Descuento por región' },
  'categoria-cliente': { corto: 'Categoría', descripcion: 'Categoría', catalogo: 'Categoría', largo: 'Descuento por categoría' },
  'producto-cliente': { corto: 'Producto', descripcion: 'Producto', catalogo: 'Producto', largo: 'Descuento por producto' },
  cliente: { corto: 'Cliente', descripcion: 'Cliente', catalogo: 'Habitual', largo: 'Descuento habitual del cliente' },
};

/** Nombre del nivel de descuento en catálogo ("Región", "Categoría general"…). */
export function nombreNivel(nivel: NivelDescuentoLista): string {
  return NIVELES[nivel]?.catalogo ?? NIVELES[nivel]?.corto ?? nivel;
}

export function obtenerNombreNivel(nivel: NivelDescuentoLista): string {
  return NIVELES[nivel]?.descripcion ?? NIVELES[nivel]?.corto ?? nivel;
}

/**
 * Orden en que se muestran los descuentos: producto, categoría, PDV y región;
 * después los propios del cliente. Es solo visual: el precio final no depende
 * del orden, porque los descuentos se encadenan multiplicando.
 */
const ORDEN_VISUAL: NivelDescuentoLista[] = [
  'producto', 'categoria', 'sucursal', 'region-cliente', 'categoria-cliente', 'producto-cliente', 'cliente',
];

/** Copia de los aportes en el orden visual (los niveles desconocidos van al final). */
export function ordenarAportes(aportes: AporteDescuentoLista[] = []) {
  const posicion = (nivel: NivelDescuentoLista) => {
    const i = ORDEN_VISUAL.indexOf(nivel);
    return i === -1 ? ORDEN_VISUAL.length : i;
  };
  return [...aportes].sort((a, b) => posicion(a.nivel) - posicion(b.nivel));
}

/** Solo los porcentajes, en el orden recibido: "3% / 7%". */
export function porcentajesDescuento(aportes: AporteDescuentoLista[] = []) {
  return aportes.map((a) => formatPorcentaje(a.porcentaje)).join(' / ');
}

/**
 * Formatea los descuentos en cadena, ej. "10% / 15% / 6%".
 * Si no hay aportes pero sí un porcentaje total mayor a 0, muestra ese valor.
 */
export function formatoDescuentosCadena(aportes: AporteDescuentoLista[] = [], descuentoTotal?: number): string {
  const activos = aportes.filter((a) => Number(a.porcentaje) > 0);
  if (activos.length > 0) {
    return activos.map((a) => formatPorcentaje(a.porcentaje)).join(' / ');
  }
  if (descuentoTotal != null && Number(descuentoTotal) > 0) {
    return formatPorcentaje(descuentoTotal);
  }
  return '0%';
}

export function detalleCorto(aportes: AporteDescuentoLista[] = []) {
  const activos = aportes.filter((a) => Number(a.porcentaje) > 0);
  const lista = activos.length > 0 ? activos : aportes;
  return lista.map((a) => `${NIVELES[a.nivel]?.corto ?? a.nivel} ${formatPorcentaje(a.porcentaje)}`).join(' · ');
}

/**
 * Detalle para tooltip al hacer hover sobre el descuento.
 * Muestra la descripción de cada descuento en una línea, ej.:
 * Sucursal: 10%
 * Categoría: 15%
 */
export function detalleLargo(aportes: AporteDescuentoLista[] = [], descuentoTotal?: number) {
  const activos = aportes.filter((a) => Number(a.porcentaje) > 0);
  if (activos.length > 0) {
    return activos
      .map((a) => `${NIVELES[a.nivel]?.descripcion ?? NIVELES[a.nivel]?.corto ?? a.nivel}: ${formatPorcentaje(a.porcentaje)}`)
      .join('\n');
  }
  if (descuentoTotal != null && Number(descuentoTotal) > 0) {
    return `Descuento: ${formatPorcentaje(descuentoTotal)}`;
  }
  return 'Sin descuentos: se usa el precio de lista.';
}
