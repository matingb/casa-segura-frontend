import { apiFetch } from '../apiFetch';

export interface Sucursal {
  id: string;
  nombre: string;
  esCentral: boolean;
  valorDolar: number;
  descuento: number | null;
  activo: boolean;
  /** Si el usuario autenticado está asignado (solo lo informa el listado de administración). */
  asignado?: boolean;
  usuarioSucursalId?: string;
  rolId?: string;
  rolNombre?: string;
}

export interface SucursalUso {
  productosConStock: number;
  usuarios: number;
}

/** Un usuario asignado a una sucursal, con su rol en ella. */
export interface AsignacionSucursal {
  usuarioId: string;
  nombre: string;
  email: string | null;
  rolId: string;
  rolNombre: string;
  /** Es el usuario autenticado. */
  esActual: boolean;
}

export interface UsuarioAsignable {
  id: string;
  nombre: string;
  email: string | null;
  esActual: boolean;
}

export interface OpcionesAsignacion {
  /** Solo un administrador puede asignar usuarios. */
  puedeAdministrar: boolean;
  usuarios: UsuarioAsignable[];
  roles: { id: string; nombre: string }[];
}

function mapApiSucursal(s: any): Sucursal {
  return {
    id: s.id,
    nombre: s.nombre ?? '',
    esCentral: s.es_central ?? false,
    valorDolar: s.valor_dolar ? Number(s.valor_dolar) : 0,
    descuento: s.descuento != null ? Number(s.descuento) : null,
    activo: s.activo ?? true,
    asignado: s.asignado,
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

  obtenerUsuarios: async (id: string): Promise<AsignacionSucursal[]> => {
    const res = await apiFetch(`/api/sucursales/${id}/usuarios`);
    if (!res.ok) throw new Error('Error al cargar los usuarios de la sucursal');
    const json = await res.json();
    return (json.data ?? []).map((a: Record<string, unknown>) => ({
      usuarioId: a.usuario_id as string,
      nombre: (a.nombre as string) ?? '',
      email: (a.email as string | null) ?? null,
      rolId: a.id_rol as string,
      rolNombre: (a.rol_nombre as string) ?? '',
      esActual: a.es_actual === true,
    }));
  },

  /** Usuarios y roles del tenant para asignar, y si el usuario autenticado puede hacerlo. */
  obtenerOpcionesAsignacion: async (): Promise<OpcionesAsignacion> => {
    const res = await apiFetch('/api/sucursales/opciones-asignacion');
    if (!res.ok) throw new Error('Error al cargar los usuarios');
    const json = await res.json();
    return {
      puedeAdministrar: json.data?.puede_administrar === true,
      usuarios: (json.data?.usuarios ?? []).map((u: Record<string, unknown>) => ({
        id: u.id as string,
        nombre: (u.nombre as string) ?? '',
        email: (u.email as string | null) ?? null,
        esActual: u.es_actual === true,
      })),
      roles: json.data?.roles ?? [],
    };
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
