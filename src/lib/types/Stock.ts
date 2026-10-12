import { ContextoMonetario, PrecioResuelto } from './Moneda';
export interface StockItem {
  id: string; // ID de producto_sucursal
  productoId: string;
  sucursalId: string;
  sucursalNombre: string;
  
  // Datos del producto
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  imagenUrl: string;
  subtipoId: string;
  precioBase: number | null;
  costoReposicionBase?: number | null;
  costoGlobal?: PrecioResuelto;
  /** Descuento general del producto, que el de la sucursal puede pisar. */
  descuentoBase?: number | null;

  // Datos específicos del stock (mezclados)
  activo: boolean; // Mezcla entre habilitado y producto_activo
  /** Costo de reposición en ARS con la cotización vigente. */
  costoReposicion: number;
  costo?: PrecioResuelto;
  precioVentaArs: number | null;
  precioVentaUsd: number | null;
  precio?: PrecioResuelto;
  precioGlobal?: PrecioResuelto;
  contextoMonetario?: ContextoMonetario;
  precioHeredado?: { ars: string | null; usd: string | null };
  iva: number;
  margenMinimo: number;
  /** Descuento del producto en esta sucursal (nivel 3 de la lista de precios). */
  descuento: number | null;
  stockMinimo: number;
  cantidadDisponible: number;
  cantidadReservada: number;
}
