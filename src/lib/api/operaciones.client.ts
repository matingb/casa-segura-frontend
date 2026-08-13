import { Operacion } from '../types/Operacion';
import { apiFetch } from '../apiFetch';

export function mapApiOperacionToOperacion(apiData: any): Operacion {
  return {
    id: apiData.id,
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
  obtenerTodas: async (): Promise<Operacion[]> => {
    const res = await apiFetch('/api/operaciones');
    if (!res.ok) throw new Error('Error al cargar operaciones');

    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiOperacionToOperacion);
    }
    return [];
  },
};
