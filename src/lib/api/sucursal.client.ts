import { apiFetch } from '../apiFetch';
import { CatalogoApiError, respuestaApi } from './apiError';

export interface Sucursal {
  id: string;
  nombre: string;
  esCentral: boolean;
  valorDolar: string | null;
  valorDolarVersion: string;
  valorDolarActualizadaAt: string | null;
  valorDolarActualizadaPor: string | null;
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

/** Referencia mínima del tenant usada solo por las excepciones globales acordadas. */
export interface ReferenciaSucursalGlobal {
  id: string;
  nombre: string;
  activo: boolean;
  esCentral: boolean;
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

function textoApi(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined;
}

function mapApiSucursal(s: Record<string, unknown>): Sucursal {
  return {
    id: String(s.id ?? ''),
    nombre: typeof s.nombre === 'string' ? s.nombre : '',
    esCentral: s.es_central === true,
    valorDolar: s.valor_dolar == null ? null : String(s.valor_dolar),
    valorDolarVersion: String(s.valor_dolar_version ?? '0'),
    valorDolarActualizadaAt: textoApi(s.valor_dolar_actualizada_at) ?? null,
    valorDolarActualizadaPor: textoApi(s.valor_dolar_actualizada_por) ?? null,
    descuento: s.descuento != null ? Number(s.descuento) : null,
    activo: s.activo !== false,
    asignado: typeof s.asignado === 'boolean' ? s.asignado : undefined,
    usuarioSucursalId: textoApi(s.usuario_sucursal_id),
    rolId: textoApi(s.id_rol),
    rolNombre: textoApi(s.rol_nombre),
  };
}

async function respuestaSucursal(res: Response, fallback: string): Promise<Record<string, unknown>> {
  const data = await respuestaApi<unknown>(res, fallback);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new CatalogoApiError(fallback, undefined, res.status);
  }
  return data as Record<string, unknown>;
}

export function notificarCotizacionSucursal(sucursalId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cotizacion-actualizada', {
      detail: { alcance: 'SUCURSAL', sucursal_id: sucursalId },
    }));
  }
}

export const sucursalClient = {
  /** Las sucursales a las que el usuario tiene acceso. */
  obtenerTodas: async (): Promise<Sucursal[]> => {
    const res = await apiFetch('/api/sucursales');
    const data = await respuestaApi<unknown>(res, 'Error al cargar los puntos de venta propios');
    if (!Array.isArray(data)) throw new CatalogoApiError('Respuesta inválida al cargar puntos de venta.', undefined, res.status);
    return data.map(mapApiSucursal);
  },

  /** Fichas completas de los puntos de venta propios; incluye inactivos si se solicita. */
  obtenerParaAdmin: async (incluirInactivas = true): Promise<Sucursal[]> => {
    const res = await apiFetch(`/api/sucursales/admin${incluirInactivas ? '?todas=true' : ''}`);
    const data = await respuestaApi<unknown>(res, 'Error al cargar los puntos de venta propios');
    if (!Array.isArray(data)) throw new CatalogoApiError('Respuesta inválida al cargar puntos de venta.', undefined, res.status);
    return data.map(mapApiSucursal);
  },

  /** Referencias globales mínimas para categorías y designación de casa central. */
  obtenerReferenciasGlobales: async (): Promise<ReferenciaSucursalGlobal[]> => {
    const res = await apiFetch('/api/sucursales/referencias-globales');
    const data = await respuestaApi<unknown>(res, 'Error al cargar referencias de puntos de venta');
    if (!Array.isArray(data)) throw new CatalogoApiError('Respuesta inválida al cargar referencias.', undefined, res.status);
    return data.map((s: Record<string, unknown>) => ({
      id: String(s.id ?? ''),
      nombre: typeof s.nombre === 'string' ? s.nombre : '',
      activo: s.activo === true,
      esCentral: s.es_central === true,
    }));
  },

  crear: async (data: Record<string, unknown>): Promise<Sucursal> => {
    const res = await apiFetch('/api/sucursales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const sucursal = mapApiSucursal(await respuestaSucursal(res, 'Error al crear la sucursal'));
    if ('valor_dolar' in data) notificarCotizacionSucursal(sucursal.id);
    return sucursal;
  },

  actualizar: async (id: string, data: Record<string, unknown>): Promise<Sucursal> => {
    const res = await apiFetch(`/api/sucursales/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const sucursal = mapApiSucursal(await respuestaSucursal(res, 'Error al actualizar la sucursal'));
    if ('valor_dolar' in data) notificarCotizacionSucursal(sucursal.id);
    return sucursal;
  },

  /** Baja lógica: la sucursal queda inactiva pero conserva su stock e historial. */
  desactivar: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/sucursales/${id}`, { method: 'DELETE' });
    await respuestaApi<unknown>(res, 'No se pudo dar de baja el punto de venta');
  },

  obtenerUsuarios: async (id: string): Promise<AsignacionSucursal[]> => {
    const res = await apiFetch(`/api/sucursales/${id}/usuarios`);
    const data = await respuestaApi<unknown>(res, 'Error al cargar los usuarios del punto de venta');
    if (!Array.isArray(data)) throw new CatalogoApiError('Respuesta inválida al cargar usuarios.', undefined, res.status);
    return data.map((a: Record<string, unknown>) => ({
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
    const data = await respuestaApi<Record<string, unknown>>(res, 'Error al cargar opciones de asignación');
    return {
      puedeAdministrar: data.puede_administrar === true,
      usuarios: (Array.isArray(data.usuarios) ? data.usuarios : []).map((u: Record<string, unknown>) => ({
        id: u.id as string,
        nombre: (u.nombre as string) ?? '',
        email: (u.email as string | null) ?? null,
        esActual: u.es_actual === true,
      })),
      roles: Array.isArray(data.roles) ? data.roles : [],
    };
  },

  obtenerUso: async (id: string): Promise<SucursalUso> => {
    const res = await apiFetch(`/api/sucursales/${id}/uso`);
    const data = await respuestaApi<Record<string, unknown>>(res, 'Error al consultar el uso del punto de venta');
    return {
      productosConStock: Number(data.productosConStock ?? 0),
      usuarios: Number(data.usuarios ?? 0),
    };
  },
};
