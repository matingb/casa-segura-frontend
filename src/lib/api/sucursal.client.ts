import { apiFetch } from '../apiFetch';

export interface Sucursal {
  id: string;
  nombre: string;
  esCentral: boolean;
  valorDolar: number;
  usuarioSucursalId?: string;
  rolId?: string;
  rolNombre?: string;
}

export const sucursalClient = {
  obtenerTodas: async (): Promise<Sucursal[]> => {
    const res = await apiFetch('/api/sucursales');
    if (!res.ok) throw new Error('Error al cargar sucursales');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map((s: any) => ({
        id: s.id,
        nombre: s.nombre ?? '',
        esCentral: s.es_central ?? false,
        valorDolar: s.valor_dolar ? Number(s.valor_dolar) : 0,
        usuarioSucursalId: s.usuario_sucursal_id,
        rolId: s.id_rol,
        rolNombre: s.rol_nombre,
      }));
    }
    return [];
  },
};
