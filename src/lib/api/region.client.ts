import { apiFetch } from '../apiFetch';
import { Region } from '../types/Region';

export type { Region };

function mapApiRegion(r: any): Region {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    sucursalId: r.sucursal_id,
    nombre: r.nombre ?? '',
    descuento: r.descuento != null ? Number(r.descuento) : 0,
    activo: r.activo ?? true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const regionClient = {
  obtenerPorSucursal: async (sucursalId: string, soloActivas = false): Promise<Region[]> => {
    const res = await apiFetch(`/api/regiones/sucursal/${sucursalId}${soloActivas ? '?solo_activas=true' : ''}`);
    if (!res.ok) throw new Error('Error al cargar regiones de la sucursal');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiRegion);
    }
    return [];
  },

  crear: async (data: { sucursal_id: string; nombre: string; descuento?: number }): Promise<Region> => {
    const res = await apiFetch('/api/regiones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al crear la región');
    }
    return mapApiRegion(json.data);
  },

  actualizar: async (
    id: string,
    data: { nombre?: string; descuento?: number; activo?: boolean }
  ): Promise<Region> => {
    const res = await apiFetch(`/api/regiones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al actualizar la región');
    }
    return mapApiRegion(json.data);
  },

  eliminar: async (id: string): Promise<void> => {
    const res = await apiFetch(`/api/regiones/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al eliminar la región');
    }
  },
};
