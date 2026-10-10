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
  precioSinTope: number | string | null; precioMinimo: number | string | null;
  costoReposicion: number | string | null; margenMinimo: number | string | null;
  noAlcanzaMargen: boolean; motivoMargen?: string;
}
export interface ListaPreciosCliente {
  items: ItemConMargenCalculado[];
  contexto_monetario: ContextoMonetario;
  sucursal: { id: string; nombre: string };
  cliente: { id: string; nombre: string; descuento_porcentaje: string | number | null; regionNombre: string | null; regionDescuento: string | number | null };
}
