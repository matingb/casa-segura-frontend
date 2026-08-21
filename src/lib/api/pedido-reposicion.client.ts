import { PedidoReposicion, PedidoReposicionCrearInput } from '../types/PedidoReposicion';
import { apiFetch } from '../apiFetch';

export function mapApiToPedidoReposicion(raw: any): PedidoReposicion {
  return {
    id:                   raw.id,
    tenantId:             raw.tenant_id ?? '',
    productoSucursalId:   raw.producto_sucursal_id ?? '',
    usuarioId:            raw.usuario_id ?? '',
    proveedorId:          raw.proveedor_id ?? '',
    cantidad:             raw.cantidad !== undefined ? Number(raw.cantidad) : 0,
    estado:               raw.estado ?? '',
    fecha:                raw.fecha ?? '',
    productoNombre:       raw.producto_nombre ?? '',
    productoCodigo:       raw.producto_codigo ?? '',
    sucursalNombre:       raw.sucursal_nombre ?? '',
    usuarioNombre:        raw.usuario_nombre ?? '',
    proveedorNombre:      raw.proveedor_nombre ?? '',
  };
}

export const pedidoReposicionClient = {
  obtenerTodos: async (): Promise<PedidoReposicion[]> => {
    const res = await apiFetch('/api/pedidos-reposicion');
    if (!res.ok) throw new Error('Error al cargar pedidos de reposición');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiToPedidoReposicion);
    }
    return [];
  },

  obtenerPaginado: async (params: {
    limit: number;
    offset: number;
    sucursalId?: string;
  }): Promise<{ data: PedidoReposicion[]; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params.limit));
    searchParams.set('offset', String(params.offset));
    if (params.sucursalId) searchParams.set('sucursalId', params.sucursalId);

    const res = await apiFetch(`/api/pedidos-reposicion?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar pedidos de reposición');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiToPedidoReposicion) : [],
      hasMore: json.page?.hasMore ?? false,
    };
  },

  obtenerPaginadoConTotal: async (params: {
    page: number;
    limit: number;
    sucursalId?: string;
    sort?: { sortBy: string; sortDir: 'asc' | 'desc' }[];
    filtros?: Record<string, string>;
  }): Promise<{ data: PedidoReposicion[]; page: number; totalPages: number; total: number }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page));
    searchParams.set('limit', String(params.limit));
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

    const res = await apiFetch(`/api/pedidos-reposicion?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar pedidos de reposición');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiToPedidoReposicion) : [],
      page: json.page?.page ?? 1,
      totalPages: json.page?.totalPages ?? 1,
      total: json.page?.total ?? 0,
    };
  },

  obtenerValoresUnicos: async (campo: string): Promise<string[]> => {
    const res = await apiFetch(`/api/pedidos-reposicion/valores-unicos?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) throw new Error('Error al cargar valores únicos');
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  },

  crear: async (input: PedidoReposicionCrearInput): Promise<PedidoReposicion> => {
    const res = await apiFetch('/api/pedidos-reposicion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        producto_sucursal_id: input.productoSucursalId,
        proveedor_id: input.proveedorId,
        cantidad: input.cantidad,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al crear el pedido de reposición');
    }
    const json = await res.json();
    return mapApiToPedidoReposicion(json.data);
  },
};
