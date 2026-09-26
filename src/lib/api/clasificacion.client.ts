import { Tipo, DescuentoSucursal } from '../types/Tipo';
import { Subtipo } from '../types/Subtipo';
import { apiFetch } from '../apiFetch';

function mapDescuentosSucursal(raw: any): DescuentoSucursal[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d: any) => ({
    id: d.id,
    sucursalId: d.sucursal_id ?? '',
    sucursalNombre: d.sucursal_nombre ?? '',
    porcentaje: Number(d.porcentaje),
  }));
}

function mapDescuentoGeneral(raw: any): number | null {
  return raw === null || raw === undefined ? null : Number(raw);
}

export function mapApiTipoToTipo(raw: any): Tipo {
  return {
    id: raw.id,
    nombre: raw.nombre ?? '',
    descuentoGeneral: mapDescuentoGeneral(raw.descuento_general),
    descuentosSucursal: mapDescuentosSucursal(raw.descuentos_sucursal),
  };
}

export function mapApiSubtipoToSubtipo(raw: any): Subtipo {
  return {
    id: raw.id,
    tipoId: raw.tipo_id ?? '',
    nombre: raw.nombre ?? '',
    descuentoGeneral: mapDescuentoGeneral(raw.descuento_general),
    descuentosSucursal: mapDescuentosSucursal(raw.descuentos_sucursal),
  };
}

export const clasificacionClient = {
  obtenerTipos: async (): Promise<Tipo[]> => {
    const res = await apiFetch('/api/tipos');
    if (!res.ok) throw new Error('Error al cargar tipos');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiTipoToTipo);
    }
    return [];
  },

  obtenerSubtipos: async (): Promise<Subtipo[]> => {
    const res = await apiFetch('/api/subtipos');
    if (!res.ok) throw new Error('Error al cargar subtipos');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiSubtipoToSubtipo);
    }
    return [];
  },

  crearTipo: async (nombre: string): Promise<Tipo> => {
    const res = await apiFetch('/api/tipos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al crear tipo');
    }
    return mapApiTipoToTipo(json.data);
  },

  eliminarTipo: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/tipos/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al eliminar tipo');
    }
  },

  crearSubtipo: async (tipoId: string, nombre: string): Promise<Subtipo> => {
    const res = await apiFetch('/api/subtipos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoId, nombre }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al crear subtipo');
    }
    return mapApiSubtipoToSubtipo(json.data);
  },

  eliminarSubtipo: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/subtipos/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al eliminar subtipo');
    }
  },

  /** Descuento que aplica a todas las sucursales. `null` lo quita. */
  setDescuentoGeneral: async (
    destino: 'tipos' | 'subtipos',
    id: string,
    descuento: number | null
  ): Promise<void> => {
    const res = await apiFetch(`/api/${destino}/${id}/descuento`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descuento_general: descuento }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al guardar el descuento');
    }
  },

  /** Excepción para una sucursal puntual. Si ya existe, la actualiza. */
  setDescuentoSucursal: async (
    destino: 'tipos' | 'subtipos',
    id: string,
    sucursalId: string,
    porcentaje: number
  ): Promise<void> => {
    const res = await apiFetch(`/api/${destino}/${id}/descuentos-sucursal`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sucursal_id: sucursalId, porcentaje }),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al guardar el descuento por sucursal');
    }
  },

  eliminarDescuentoSucursal: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/descuentos-categoria/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al eliminar el descuento');
    }
  },
};

