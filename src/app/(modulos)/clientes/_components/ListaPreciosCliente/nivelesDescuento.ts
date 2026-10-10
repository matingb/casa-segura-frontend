import { AporteDescuentoLista, NivelDescuentoLista } from '../../../../../lib/types/ListaPreciosCliente';
import { formatPorcentaje } from '../../../../../lib/utils/formatters';

/** Nombres simples de cada nivel del cálculo, en el orden en que se aplican. */
const NIVELES: Record<NivelDescuentoLista, { corto: string; largo: string }> = {
  sucursal: { corto: 'Sucursal', largo: 'Descuento de la sucursal' },
  categoria: { corto: 'Categoría general', largo: 'Descuento general de la categoría' },
  producto: { corto: 'General', largo: 'Descuento general del producto (para todos los clientes)' },
  'region-cliente': { corto: 'Región', largo: 'Descuento por región' },
  'categoria-cliente': { corto: 'Categoría', largo: 'Descuento por categoría' },
  'producto-cliente': { corto: 'Producto', largo: 'Descuento por producto' },
  cliente: { corto: 'Habitual', largo: 'Descuento habitual del cliente (se suma al final)' },
};

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
