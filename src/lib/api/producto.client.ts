import { Producto } from '../types/Producto';
import { apiFetch } from '../apiFetch';

export function mapApiProductoToProducto(apiProd: any): Producto {
  return {
    id: apiProd.id,
    subtipoId: apiProd.subtipo_id ?? '',
    codigo: apiProd.codigo ?? '',
    codigoBarraProveedor: apiProd.codigo_barra_proveedor ?? '',
    nombre: apiProd.nombre ?? '',
    marca: apiProd.marca ?? '',
    modelo: apiProd.modelo ?? '',
    color: apiProd.color ?? '',
    presentacion: apiProd.presentacion ?? '',
    alto: apiProd.alto ?? 0,
    ancho: apiProd.ancho ?? 0,
    profundidad: apiProd.profundidad ?? 0,
    pesoUnitario: apiProd.peso_unitario ?? 0,
    imagenUrl: apiProd.imagen_url ?? '',
    descripcion: apiProd.descripcion ?? '',
    activo: apiProd.activo ?? false,
    precioBase: apiProd.precio_base ? Number(apiProd.precio_base) : 0,
    codigoQr: apiProd.codigo_qr ?? '',
  };
}

export const productoClient = {
  obtenerTodos: async (): Promise<Producto[]> => {
    const res = await apiFetch('/api/productos');
    if (!res.ok) throw new Error('Error al cargar productos');

    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiProductoToProducto);
    }
    return [];
  },

  obtenerPorId: async (id: string): Promise<Producto | null> => {
    const res = await apiFetch(`/api/productos/${id}`);
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return mapApiProductoToProducto(json.data);
    }
    return null;
  },

  obtenerPaginado: async (params: {
    limit: number;
    offset: number;
    search?: string;
  }): Promise<{ data: Producto[]; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params.limit));
    searchParams.set('offset', String(params.offset));
    if (params.search) searchParams.set('search', params.search);

    const res = await apiFetch(`/api/productos?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar productos');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiProductoToProducto) : [],
      hasMore: json.page?.hasMore ?? false,
    };
  },

  obtenerPaginadoConTotal: async (params: {
    page: number;
    limit: number;
    search?: string;
    sort?: { sortBy: string; sortDir: 'asc' | 'desc' }[];
    filtros?: Record<string, string>;
  }): Promise<{ data: Producto[]; page: number; totalPages: number; total: number }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page));
    searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.sort && params.sort.length > 0) {
      searchParams.set('sortBy', params.sort.map((c) => c.sortBy).join(','));
      searchParams.set('sortDir', params.sort.map((c) => c.sortDir).join(','));
    }
    if (params.filtros) {
      for (const [key, value] of Object.entries(params.filtros)) {
        if (value) searchParams.set(`filtro_${key}`, value);
      }
    }

    const res = await apiFetch(`/api/productos?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar productos');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiProductoToProducto) : [],
      page: json.page?.page ?? 1,
      totalPages: json.page?.totalPages ?? 1,
      total: json.page?.total ?? 0,
    };
  },

  obtenerValoresUnicos: async (campo: string): Promise<string[]> => {
    const res = await apiFetch(`/api/productos/valores-unicos?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) throw new Error('Error al cargar valores únicos');
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  },

  crear: async (data: Record<string, unknown>): Promise<Producto> => {
    const res = await apiFetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al crear producto');
    }
    const json = await res.json();
    return mapApiProductoToProducto(json.data);
  },

  actualizar: async (id: string, data: Record<string, unknown>): Promise<Producto> => {
    const res = await apiFetch(`/api/productos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al actualizar producto');
    }
    const json = await res.json();
    return mapApiProductoToProducto(json.data);
  },
};
