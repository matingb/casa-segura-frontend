import { Operacion } from '../types/Operacion';
import { apiFetch } from '../apiFetch';

export function mapApiOperacionToOperacion(apiData: any): Operacion {
  return {
    id: apiData.id,
    sucursalId: apiData.sucursal_id ?? '',
    tipoId: apiData.tipo_id ?? '',
    tipoNombre: apiData.tipo_nombre ?? '',
    usuarioNombre: apiData.usuario_nombre ?? '',
    sucursalNombre: apiData.sucursal_nombre ?? '',
    monto: apiData.monto ? Number(apiData.monto) : 0,
    descripcion: apiData.descripcion ?? '',
    fecha: apiData.fecha ?? '',
  };
}

export const operacionesClient = {
  obtenerTodas: async (params?: {
    sucursalId?: string;
    tipoId?: string;
  }): Promise<Operacion[]> => {
    const searchParams = new URLSearchParams();
    if (params?.sucursalId) searchParams.set('sucursalId', params.sucursalId);
    if (params?.tipoId) searchParams.set('tipoId', params.tipoId);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res = await apiFetch(`/api/operaciones${queryString}`);
    if (!res.ok) throw new Error('Error al cargar operaciones');

    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiOperacionToOperacion);
    }
    return [];
  },

  obtenerPaginado: async (params: {
    limit: number;
    offset: number;
    sucursalId?: string;
    tipoId?: string;
  }): Promise<{ data: Operacion[]; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params.limit));
    searchParams.set('offset', String(params.offset));
    if (params.sucursalId) searchParams.set('sucursalId', params.sucursalId);
    if (params.tipoId) searchParams.set('tipoId', params.tipoId);

    const res = await apiFetch(`/api/operaciones?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar operaciones');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiOperacionToOperacion) : [],
      hasMore: json.page?.hasMore ?? false,
    };
  },
};
