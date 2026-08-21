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
    precioBase: apiData.producto_precio_base ? Number(apiData.producto_precio_base) : 0,

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

  obtenerPaginadoConTotal: async (params: {
    page: number;
    limit: number;
    search?: string;
    sucursalId?: string;
    sort?: { sortBy: string; sortDir: 'asc' | 'desc' }[];
    filtros?: Record<string, string>;
  }): Promise<{ data: StockItem[]; page: number; totalPages: number; total: number }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page));
    searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.sucursalId) searchParams.set('sucursalId', params.sucursalId);
    if (params.sort && params.sort.length > 0) {
      searchParams.set('sortBy', params.sort.map((c) => c.sortBy).join(','));
      searchParams.set('sortDir', params.sort.map((c) => c.sortDir).join(','));
    }
    if (params.filtros) {
      for (const [key, value] of Object.entries(params.filtros)) {
        if (value) searchParams.set(`filtro_${key}`, value);
      }
    }

    const res = await apiFetch(`/api/producto-sucursal?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar stock');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiProductoSucursalToStockItem) : [],
      page: json.page?.page ?? 1,
      totalPages: json.page?.totalPages ?? 1,
      total: json.page?.total ?? 0,
    };
  },

  obtenerValoresUnicos: async (campo: string): Promise<string[]> => {
    const res = await apiFetch(`/api/producto-sucursal/valores-unicos?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) throw new Error('Error al cargar valores únicos');
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  },

  crear: async (data: Record<string, unknown>): Promise<StockItem> => {
    const res = await apiFetch('/api/producto-sucursal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al crear stock');
    }
    const json = await res.json();
    return mapApiProductoSucursalToStockItem(json.data);
  },

  actualizar: async (id: string, data: Record<string, unknown>): Promise<StockItem> => {
    const res = await apiFetch(`/api/producto-sucursal/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al actualizar stock');
    }
    const json = await res.json();
    return mapApiProductoSucursalToStockItem(json.data);
  },
};
