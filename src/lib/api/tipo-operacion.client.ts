import { apiFetch } from '../apiFetch';

export interface TipoOperacion {
  id: string;
  nombre: string;
}

export const tipoOperacionClient = {
  obtenerTodos: async (): Promise<TipoOperacion[]> => {
    const res = await apiFetch('/api/tipos-operacion');
    if (!res.ok) throw new Error('Error al cargar tipos de operación');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  },
};
