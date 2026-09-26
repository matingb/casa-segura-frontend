import { apiFetch } from '../apiFetch';

export interface Sucursal {
  id: string;
  nombre: string;
  esCentral: boolean;
  valorDolar: number;
  descuento: number | null;
  activo: boolean;
  usuarioSucursalId?: string;
  rolId?: string;
  rolNombre?: string;
}

export interface SucursalUso {
  productosConStock: number;
  usuarios: number;
}

function mapApiSucursal(s: any): Sucursal {
  return {
    id: s.id,
    nombre: s.nombre ?? '',
    esCentral: s.es_central ?? false,
    valorDolar: s.valor_dolar ? Number(s.valor_dolar) : 0,
    descuento: s.descuento != null ? Number(s.descuento) : null,
    activo: s.activo ?? true,
    usuarioSucursalId: s.usuario_sucursal_id,
    rolId: s.id_rol,
    rolNombre: s.rol_nombre,
  };
}

export const sucursalClient = {
  /** Las sucursales a las que el usuario tiene acceso. */
  obtenerTodas: async (): Promise<Sucursal[]> => {
    const res = await apiFetch('/api/sucursales');
    if (!res.ok) throw new Error('Error al cargar sucursales');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiSucursal);
    }
    return [];
  },

  /** Todas las del tenant, para administrarlas desde Configuración. */
  obtenerParaAdmin: async (incluirInactivas = true): Promise<Sucursal[]> => {
    const res = await apiFetch(`/api/sucursales/admin${incluirInactivas ? '?todas=true' : ''}`);
    if (!res.ok) throw new Error('Error al cargar sucursales');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiSucursal);
    }
    return [];
  },

  crear: async (data: Record<string, unknown>): Promise<Sucursal> => {
    const res = await apiFetch('/api/sucursales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al crear la sucursal');
    }
    return mapApiSucursal(json.data);
  },

  actualizar: async (id: string, data: Record<string, unknown>): Promise<Sucursal> => {
    const res = await apiFetch(`/api/sucursales/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al actualizar la sucursal');
    }
    return mapApiSucursal(json.data);
  },

  /** Baja lógica: la sucursal queda inactiva pero conserva su stock e historial. */
  desactivar: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/sucursales/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'No se pudo dar de baja la sucursal');
    }
  },

  obtenerUso: async (id: string): Promise<SucursalUso> => {
    const res = await apiFetch(`/api/sucursales/${id}/uso`);
    if (!res.ok) throw new Error('Error al consultar el uso de la sucursal');
    const json = await res.json();
    return {
      productosConStock: json.data?.productosConStock ?? 0,
      usuarios: json.data?.usuarios ?? 0,
    };
  },
};
