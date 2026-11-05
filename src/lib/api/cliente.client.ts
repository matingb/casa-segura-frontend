import { Cliente } from '../types/Cliente';
import { apiFetch } from '../apiFetch';
import { CatalogoApiError, errorCatalogo } from './apiError';

export type ActualizarClienteResult =
  | { cliente: Cliente; accesoRevocado: false }
  | { cliente: null; accesoRevocado: true };

export function mapApiClienteToCliente(apiCli: any): Cliente {
  return {
    id: apiCli.id,
    nombre: apiCli.nombre ?? '',
    tipoCliente: apiCli.tipo_cliente ?? 'persona',
    razonSocial: apiCli.razon_social ?? '',
    nombreContacto: apiCli.nombre_contacto ?? '',
    sucursales: Array.isArray(apiCli.sucursales)
      ? apiCli.sucursales.map((s: any) => ({ id: s.id, nombre: s.nombre ?? '' }))
      : [],
    tipoDocumento: apiCli.tipo_documento ?? '',
    nroDocumento: apiCli.nro_documento ?? '',
    condicionIva: apiCli.condicion_iva ?? '',
    email: apiCli.email ?? '',
    telefono: apiCli.telefono ?? '',
    direccion: apiCli.direccion ?? '',
    localidad: apiCli.localidad ?? '',
    provincia: apiCli.provincia ?? '',
    codigoPostal: apiCli.codigo_postal ?? '',
    descuentoPorcentaje: apiCli.descuento_porcentaje != null ? Number(apiCli.descuento_porcentaje) : null,
    observaciones: apiCli.observaciones ?? '',
    activo: apiCli.activo ?? false,
  };
}

export const clienteClient = {
  obtenerTodos: async (params?: { operativo?: boolean }): Promise<Cliente[]> => {
    const query = params?.operativo ? '?operativo=true' : '';
    const res = await apiFetch(`/api/clientes${query}`);
    if (!res.ok) return errorCatalogo(res, 'Error al cargar clientes');

    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiClienteToCliente);
    }
    return [];
  },

  obtenerPorId: async (id: string): Promise<Cliente | null> => {
    const res = await apiFetch(`/api/clientes/${id}`);
    if (!res.ok) return errorCatalogo(res, 'El recurso no está disponible.');

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return mapApiClienteToCliente(json.data);
    }
    return null;
  },

  obtenerPaginadoConTotal: async (params: {
    page: number;
    limit: number;
    search?: string;
    sort?: { sortBy: string; sortDir: 'asc' | 'desc' }[];
    filtros?: Record<string, string>;
  }): Promise<{ data: Cliente[]; page: number; totalPages: number; total: number }> => {
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

    const res = await apiFetch(`/api/clientes?${searchParams}`);
    if (!res.ok) return errorCatalogo(res, 'Error al cargar clientes');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiClienteToCliente) : [],
      page: json.page?.page ?? 1,
      totalPages: json.page?.totalPages ?? 1,
      total: json.page?.total ?? 0,
    };
  },

  obtenerValoresUnicos: async (campo: string): Promise<string[]> => {
    const res = await apiFetch(`/api/clientes/valores-unicos?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) return errorCatalogo(res, 'Error al cargar valores únicos');
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  },

  crear: async (data: Record<string, unknown>): Promise<Cliente> => {
    const res = await apiFetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      return errorCatalogo(res, 'Error al crear cliente');
    }
    const json = await res.json();
    return mapApiClienteToCliente(json.data);
  },

  actualizar: async (id: string, data: Record<string, unknown>): Promise<ActualizarClienteResult> => {
    const res = await apiFetch(`/api/clientes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return errorCatalogo(res, 'Error al actualizar cliente');
    const json = await res.json();
    if (json.status === 'success' && json.acceso_revocado === true && json.data === null) {
      return { cliente: null, accesoRevocado: true };
    }
    if (json.status !== 'success' || !json.data) {
      throw new CatalogoApiError(json.message ?? 'Respuesta inválida al actualizar el cliente.');
    }
    return { cliente: mapApiClienteToCliente(json.data), accesoRevocado: false };
  },

  eliminar: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/clientes/${id}`, { method: 'DELETE' });
    if (!res.ok) return errorCatalogo(res, 'No se pudo dar de baja el cliente');
  },
};
