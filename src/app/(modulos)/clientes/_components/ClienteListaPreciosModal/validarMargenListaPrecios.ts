import { ItemListaCliente } from './exportPdfCliente';

export interface ItemConMargenCalculado extends ItemListaCliente {
  id: string;
  productoId: string;
  descuentosDetalle: string[];
  precioSinTope: number;
  precioMinimo: number | null;
  costoReposicion: number | null;
  margenMinimo: number | null;
  noAlcanzaMargen: boolean;
  motivoMargen?: string;
}

export interface ResultadoValidacionMargen {
  puedeGenerar: boolean;
  productosBajoMargen: ItemConMargenCalculado[];
  mensajeError?: string;
}

/**
 * Valida si la lista de precios cumple con la política de margen de ganancia.
 * Regla de negocio: No se puede generar una lista de precios si algún producto
 * con los descuentos aplicados no permite llegar al margen mínimo configurado.
 */
export function validarMargenListaPrecios(
  items: ItemConMargenCalculado[]
): ResultadoValidacionMargen {
  const productosBajoMargen = items.filter((item) => item.noAlcanzaMargen);

  if (productosBajoMargen.length > 0) {
    return {
      puedeGenerar: false,
      productosBajoMargen,
      mensajeError: `No se puede generar la lista de precios: Hay ${productosBajoMargen.length} producto(s) cuyos descuentos configurados no permiten alcanzar el margen mínimo de ganancia.`,
    };
  }

  return {
    puedeGenerar: true,
    productosBajoMargen: [],
  };
}

/**
 * Evalúa si un producto individual con sus descuentos en cascada alcanza el margen.
 */
export function evaluarAlcanzaMargen(params: {
  precioSinTope: number;
  costoReposicion?: number | null;
  margenMinimo?: number | null;
  precioMinimo?: number | null;
}): { noAlcanzaMargen: boolean; motivo?: string } {
  const { precioSinTope, costoReposicion, margenMinimo, precioMinimo } = params;

  const costo = costoReposicion != null && Number(costoReposicion) > 0 ? Number(costoReposicion) : null;
  const margen = margenMinimo != null && Number(margenMinimo) >= 0 ? Number(margenMinimo) : null;

  // Si no hay costo o margen configurado, no hay restricción de piso
  if (costo === null || margen === null) {
    return { noAlcanzaMargen: false };
  }

  const pisoCalculado = precioMinimo ?? Math.round(costo * (1 + margen / 100) * 100) / 100;

  // Venta en pérdida
  if (precioSinTope < costo - 0.01) {
    return {
      noAlcanzaMargen: true,
      motivo: `Precio ($${precioSinTope.toFixed(2)}) inferior al costo ($${costo.toFixed(2)})`,
    };
  }

  // Margen perforado (por debajo del piso)
  if (precioSinTope < pisoCalculado - 0.01) {
    const ganancia = precioSinTope - costo;
    const margenEfectivo = Math.round((ganancia / costo) * 10000) / 100;
    return {
      noAlcanzaMargen: true,
      motivo: `Margen efectivo (${margenEfectivo}%) inferior al mínimo exigido (${margen}%, piso: $${pisoCalculado.toFixed(2)})`,
    };
  }

  return { noAlcanzaMargen: false };
}
