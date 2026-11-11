import { Dinero } from './precio';

type Importe = number | string | null | undefined;

/** Porcentaje sobre la venta: (precio - costo) / precio, redondeado a dos decimales. */
export function calcularMargenVenta(precio: Importe, costo: Importe): number | null {
  if (precio == null || costo == null || String(precio).trim() === '' || String(costo).trim() === '' ||
    !Number.isFinite(Number(precio)) || !Number.isFinite(Number(costo))) return null;

  const venta = new Dinero(precio);
  const reposicion = new Dinero(costo);
  if (venta.lte(0) || reposicion.lt(0)) return null;

  return venta.minus(reposicion).div(venta).times(100).toDecimalPlaces(2).toNumber() || 0;
}
