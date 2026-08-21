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
};
