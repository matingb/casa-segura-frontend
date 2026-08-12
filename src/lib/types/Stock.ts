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

  // Datos específicos del stock (mezclados)
  activo: boolean; // Mezcla entre habilitado y producto_activo
  costoReposicion: number;
  precioVentaArs: number;
  precioVentaUsd: number;
  iva: number;
  margenMinimo: number;
  stockMinimo: number;
  cantidadDisponible: number;
  cantidadReservada: number;
}
