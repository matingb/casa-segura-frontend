import { PedidoReposicion } from '../types/PedidoReposicion';
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
  }): Promise<{ data: PedidoReposicion[]; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params.limit));
    searchParams.set('offset', String(params.offset));

    const res = await apiFetch(`/api/pedidos-reposicion?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar pedidos de reposición');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiToPedidoReposicion) : [],
      hasMore: json.page?.hasMore ?? false,
    };
  },
};
