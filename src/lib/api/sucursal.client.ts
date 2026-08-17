import { apiFetch } from '../apiFetch';

export interface Sucursal {
  id: string;
  nombre: string;
  esCentral: boolean;
  valorDolar: number;
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
      }));
    }
    return [];
  },
};
