import { StockItem } from '../types/Stock';
import { apiFetch } from '../apiFetch';

export function mapApiProductoSucursalToStockItem(apiData: any): StockItem {
  return {
    id: apiData.id,
    productoId: apiData.producto_id,
    sucursalId: apiData.sucursal_id,
    sucursalNombre: apiData.sucursal_nombre ?? '',
    
    codigo: apiData.producto_codigo ?? '',
    nombre: apiData.producto_nombre ?? '',
    marca: apiData.producto_marca ?? '',
    modelo: apiData.producto_modelo ?? '',
    imagenUrl: apiData.producto_imagen_url ?? '',
    subtipoId: apiData.producto_subtipo_id ?? '',

    activo: apiData.habilitado ?? apiData.producto_activo ?? false,
    costoReposicion: apiData.costo_reposicion ? Number(apiData.costo_reposicion) : 0,
    precioVentaArs: apiData.precio_venta_ars ? Number(apiData.precio_venta_ars) : 0,
    precioVentaUsd: apiData.precio_venta_usd ? Number(apiData.precio_venta_usd) : 0,
    iva: apiData.iva ? Number(apiData.iva) : 21,
    margenMinimo: apiData.margen_minimo ? Number(apiData.margen_minimo) : 0,
    stockMinimo: apiData.stock_minimo ?? 0,
    cantidadDisponible: apiData.cantidad_disponible ?? 0,
    cantidadReservada: apiData.cantidad_reservada ?? 0,
  };
}

export const stockClient = {
  obtenerTodos: async (): Promise<StockItem[]> => {
    const res = await apiFetch('/api/producto-sucursal');
    if (!res.ok) throw new Error('Error al cargar stock');
    
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiProductoSucursalToStockItem);
    }
    return [];
  }
};
