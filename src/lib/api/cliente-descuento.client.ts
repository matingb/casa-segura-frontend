import { apiFetch } from '../apiFetch';
import {
  ClienteRegion,
  ClienteDescuentoCategoria,
  ClienteDescuentoProducto,
  DescuentosClienteResumen,
} from '../types/Region';

function mapClienteRegion(r: any): ClienteRegion {
  return {
    id: r.id,
    clienteId: r.cliente_id,
    sucursalId: r.sucursal_id,
    sucursalNombre: r.sucursal_nombre ?? '',
    regionId: r.region_id,
    regionNombre: r.region_nombre ?? '',
    descuento: Number(r.descuento ?? 0),
    createdAt: r.created_at,
  };
}

function mapClienteDescuentoCategoria(c: any): ClienteDescuentoCategoria {
  return {
    id: c.id,
    clienteId: c.cliente_id,
    tipoId: c.tipo_id ?? null,
    tipoNombre: c.tipo_nombre ?? null,
    subtipoId: c.subtipo_id ?? null,
    subtipoNombre: c.subtipo_nombre ?? null,
    categoriaPadreId: c.categoria_padre_id ?? null,
    categoriaPadreNombre: c.categoria_padre_nombre ?? null,
    porcentaje: Number(c.porcentaje ?? 0),
    nota: c.nota ?? null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

function mapClienteDescuentoProducto(p: any): ClienteDescuentoProducto {
  return {
    id: p.id,
    clienteId: p.cliente_id,
    productoId: p.producto_id,
    productoCodigo: p.producto_codigo ?? '',
    productoNombre: p.producto_nombre ?? '',
    productoPrecioBase: Number(p.producto_precio_base ?? 0),
    porcentaje: Number(p.porcentaje ?? 0),
    nota: p.nota ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export const clienteDescuentoClient = {
  obtenerDescuentos: async (clienteId: string): Promise<DescuentosClienteResumen> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos`);
    if (!res.ok) throw new Error('Error al cargar descuentos del cliente');
    const json = await res.json();
    if (json.status !== 'success' || !json.data) {
      throw new Error(json.message || 'Error al cargar descuentos');
    }
    const d = json.data;
    return {
      clienteId: d.clienteId,
      descuentoGeneral: d.descuentoGeneral != null ? Number(d.descuentoGeneral) : null,
      regiones: Array.isArray(d.regiones) ? d.regiones.map(mapClienteRegion) : [],
      categorias: Array.isArray(d.categorias) ? d.categorias.map(mapClienteDescuentoCategoria) : [],
      productos: Array.isArray(d.productos) ? d.productos.map(mapClienteDescuentoProducto) : [],
    };
  },

  asignarCategoria: async (
    clienteId: string,
    data: { tipo_id?: string; subtipo_id?: string; porcentaje: number; nota?: string }
  ): Promise<ClienteDescuentoCategoria> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos/categoria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al asignar descuento de categoría');
    }
    return mapClienteDescuentoCategoria(json.data);
  },

  quitarCategoria: async (clienteId: string, descuentoId: string): Promise<void> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos/categoria/${descuentoId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al quitar descuento de categoría');
    }
  },

  asignarProducto: async (
    clienteId: string,
    data: { producto_id: string; porcentaje: number; nota?: string }
  ): Promise<ClienteDescuentoProducto> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos/producto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al asignar descuento de producto');
    }
    return mapClienteDescuentoProducto(json.data);
  },

  quitarProducto: async (clienteId: string, descuentoId: string): Promise<void> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos/producto/${descuentoId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al quitar descuento de producto');
    }
  },

  asignarRegion: async (
    clienteId: string,
    data: { sucursal_id: string; region_id: string }
  ): Promise<ClienteRegion> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/region`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al asignar región');
    }
    return mapClienteRegion(json.data);
  },

  quitarRegion: async (clienteId: string, sucursalId: string): Promise<void> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/region/${sucursalId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
      throw new Error(json.message || 'Error al quitar región');
    }
  },
};
