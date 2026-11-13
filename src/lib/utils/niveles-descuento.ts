import { AporteDescuentoLista, NivelDescuentoLista } from '../types/ListaPreciosCliente';
import { formatPorcentaje } from './formatters';

/** Nombres simples de cada nivel del cálculo, en el orden en que se aplican. */
const NIVELES: Record<NivelDescuentoLista, { corto: string; largo: string }> = {
  sucursal: { corto: 'Sucursal', largo: 'Descuento de la sucursal' },
  categoria: { corto: 'Categoría general', largo: 'Descuento general de la categoría' },
  producto: { corto: 'Producto general', largo: 'Descuento general del producto (para todos los clientes)' },
  'region-cliente': { corto: 'Región', largo: 'Descuento por región' },
  'categoria-cliente': { corto: 'Categoría', largo: 'Descuento por categoría' },
  'producto-cliente': { corto: 'Producto', largo: 'Descuento por producto' },
  cliente: { corto: 'Habitual', largo: 'Descuento habitual del cliente' },
};

/** Nombre corto del nivel de descuento ("Región", "Categoría general"…). */
export function nombreNivel(nivel: NivelDescuentoLista) {
  return NIVELES[nivel]?.corto ?? nivel;
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
  return aportes.map(a => formatPorcentaje(a.porcentaje)).join(' / ');
}

export function detalleCorto(aportes: AporteDescuentoLista[] = []) {
  return aportes.map(a => `${NIVELES[a.nivel]?.corto ?? a.nivel} ${formatPorcentaje(a.porcentaje)}`).join(' · ');
}

export function detalleLargo(aportes: AporteDescuentoLista[] = []) {
  if (!aportes.length) return 'Sin descuentos: se usa el precio de lista.';
  return [
    ...aportes.map(a => `${NIVELES[a.nivel]?.largo ?? a.nivel}: ${formatPorcentaje(a.porcentaje)}`),
    'Los descuentos se aplican uno después del otro: 10% + 5% no es 15%, es 14,5%.',
  ].join('\n');
}
