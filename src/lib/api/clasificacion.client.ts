import { Tipo } from '../types/Tipo';
import { Subtipo } from '../types/Subtipo';
import { apiFetch } from '../apiFetch';

export function mapApiTipoToTipo(raw: any): Tipo {
  return {
    id: raw.id,
    nombre: raw.nombre ?? '',
  };
}

export function mapApiSubtipoToSubtipo(raw: any): Subtipo {
  return {
    id: raw.id,
    tipoId: raw.tipo_id ?? '',
    nombre: raw.nombre ?? '',
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
};

