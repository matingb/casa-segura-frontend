import { apiFetch } from '../apiFetch';

export interface Proveedor {
  id: string;
  nombre: string;
  cuit: string;
  email: string;
  telefono: string;
}

function mapApiProveedorToProveedor(raw: any): Proveedor {
  return {
    id: raw.id,
    nombre: raw.nombre ?? '',
    cuit: raw.cuit ?? '',
    email: raw.email ?? '',
    telefono: raw.telefono ?? '',
  };
}

export const proveedorClient = {
  obtenerTodos: async (): Promise<Proveedor[]> => {
    const res = await apiFetch('/api/proveedores');
    if (!res.ok) throw new Error('Error al cargar proveedores');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiProveedorToProveedor);
    }
    return [];
  },
};
