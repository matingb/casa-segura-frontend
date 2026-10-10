import { calcularCascada } from '../../../../../lib/utils/cascada-descuentos';
import { ItemConMargenCalculado, NivelDescuentoLista } from '../../../../../lib/types/ListaPreciosCliente';

type NivelCliente = Extract<NivelDescuentoLista, 'region-cliente' | 'categoria-cliente' | 'producto-cliente'>;

const numero = (valor: number | string | null | undefined) => (valor == null || valor === '' ? null : Number(valor));

/**
 * Vista previa del precio de un producto si cambia algún descuento del cliente.
 * Usa el espejo frontend de la cascada (lib/utils/cascada-descuentos) con los
 * niveles que devolvió el backend; al guardar, la lista se recalcula en el backend.
 */
export function simularPrecio(item: ItemConMargenCalculado, cambios: Partial<Record<NivelCliente, number | null>> = {}) {
  const niveles: Partial<Record<NivelDescuentoLista, number | null>> = {};
  for (const aporte of item.descuentosAportes ?? []) niveles[aporte.nivel] = aporte.porcentaje;
  Object.assign(niveles, cambios);
  const resultado = calcularCascada({
    precioBase: Number(item.precioListaArs ?? 0),
    descuentoProducto: niveles.producto,
    descuentoRegionCliente: niveles['region-cliente'],
    descuentoCategoriaCliente: niveles['categoria-cliente'],
    descuentoProductoCliente: niveles['producto-cliente'],
    descuentoCliente: niveles.cliente,
    costoReposicion: numero(item.costoReposicion),
    margenMinimo: numero(item.margenMinimo),
  });
  return {
    precioFinal: resultado.precioFinal,
    descuentoTotal: resultado.descuentoEfectivo,
    debajoDelMargen: resultado.topeAplicado,
  };
}

const NOMBRES: Record<NivelDescuentoLista, string> = {
  sucursal: 'sucursal', categoria: 'categoría general', producto: 'descuento general', 'region-cliente': 'región',
  'categoria-cliente': 'categoría', 'producto-cliente': 'producto', cliente: 'descuento habitual',
};

/** "región y categoría": de dónde salen los descuentos que ya tiene, sin contar el nivel que se está editando. */
export function origenDescuentos(item: ItemConMargenCalculado, excluir: NivelDescuentoLista) {
  const nombres = (item.descuentosAportes ?? []).filter(a => a.nivel !== excluir).map(a => NOMBRES[a.nivel]);
  return nombres.length <= 1 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}
