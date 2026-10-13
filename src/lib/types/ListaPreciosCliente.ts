import { ContextoMonetario, Moneda, PrecioResuelto } from './Moneda';
export interface ItemListaCliente {
  codigo: string; nombre: string; marca?: string; modelo?: string; subtipoNombre: string;
  precioListaArs: number | string | null;
  descuentoTotalPorcentaje: number;
  precioFinalArs: number | string | null;
  precioFinalUsd: number | string | null;
  iva?: number | string;
  monedaReferencia?: Moneda;
  importeReferencia?: string | null;
  importeFinalReferencia?: string | null;
  estadoPrecio?: PrecioResuelto['estado'];
}
export type NivelDescuentoLista = 'sucursal' | 'categoria' | 'producto' | 'region-cliente' | 'categoria-cliente' | 'producto-cliente' | 'cliente';
export interface AporteDescuentoLista { nivel: NivelDescuentoLista; porcentaje: number }
export interface ItemConMargenCalculado extends ItemListaCliente {
  id: string; productoId: string; descuentosDetalle: string[]; descuentosAportes?: AporteDescuentoLista[];
  tipoId?: string | null; subtipoId?: string | null;
  /** Descuentos generales de categoría y de producto en la sucursal, se apliquen o no (los del cliente los reemplazan). */
  descuentoCategoriaGeneral?: number | null;
  descuentoProductoGeneral?: number | null;
  precioSinTope: number | string | null; precioMinimo: number | string | null;
  costoReposicion: number | string | null; margenMinimo: number | string | null;
  noAlcanzaMargen: boolean; motivoMargen?: string;
}
/** Lista general de una sucursal: solo los descuentos que valen para todos los clientes. */
export interface ListaPreciosSucursal {
  items: ItemConMargenCalculado[];
  contexto_monetario: ContextoMonetario;
  sucursal: { id: string; nombre: string };
}
export interface ListaPreciosCliente {
  items: ItemConMargenCalculado[];
  contexto_monetario: ContextoMonetario;
  sucursal: { id: string; nombre: string };
  cliente: { id: string; nombre: string; descuento_porcentaje: string | number | null; regionNombre: string | null; regionDescuento: string | number | null };
}
