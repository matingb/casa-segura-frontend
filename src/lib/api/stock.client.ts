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
  },

  obtenerPorId: async (id: string): Promise<StockItem | null> => {
    const res = await apiFetch(`/api/producto-sucursal/${id}`);
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return mapApiProductoSucursalToStockItem(json.data);
    }
    return null;
  },

  obtenerPaginado: async (params: {
    limit: number;
    offset: number;
    search?: string;
    sucursalId?: string;
  }): Promise<{ data: StockItem[]; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params.limit));
    searchParams.set('offset', String(params.offset));
    if (params.search) searchParams.set('search', params.search);
    if (params.sucursalId) searchParams.set('sucursalId', params.sucursalId);

    const res = await apiFetch(`/api/producto-sucursal?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar stock');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiProductoSucursalToStockItem) : [],
      hasMore: json.page?.hasMore ?? false,
    };
  },
};
