import { apiFetch } from '../apiFetch';
import { respuestaApi } from './apiError';
import {
  ClienteRegion,
  ClienteDescuentoCategoria,
  ClienteDescuentoProducto,
  DescuentosClienteResumen,
} from '../types/Region';

type ApiRecord = Record<string, unknown>;

function texto(valor: unknown, fallback = ''): string {
  return typeof valor === 'string' ? valor : fallback;
}

function nullableTexto(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

function mapClienteRegion(r: ApiRecord): ClienteRegion {
  return {
    id: texto(r.id),
    clienteId: texto(r.cliente_id),
    sucursalId: texto(r.sucursal_id),
    sucursalNombre: texto(r.sucursal_nombre),
    regionId: texto(r.region_id),
    regionNombre: texto(r.region_nombre),
    descuento: Number(r.descuento ?? 0),
    createdAt: nullableTexto(r.created_at) ?? undefined,
  };
}

function mapClienteDescuentoCategoria(c: ApiRecord): ClienteDescuentoCategoria {
  return {
    id: texto(c.id),
    clienteId: texto(c.cliente_id),
    tipoId: nullableTexto(c.tipo_id),
    tipoNombre: nullableTexto(c.tipo_nombre),
    subtipoId: nullableTexto(c.subtipo_id),
    subtipoNombre: nullableTexto(c.subtipo_nombre),
    categoriaPadreId: nullableTexto(c.categoria_padre_id),
    categoriaPadreNombre: nullableTexto(c.categoria_padre_nombre),
    porcentaje: Number(c.porcentaje ?? 0),
    nota: nullableTexto(c.nota),
    createdAt: nullableTexto(c.created_at) ?? undefined,
    updatedAt: nullableTexto(c.updated_at) ?? undefined,
  };
}

function mapClienteDescuentoProducto(p: ApiRecord): ClienteDescuentoProducto {
  return {
    id: texto(p.id),
    clienteId: texto(p.cliente_id),
    productoId: texto(p.producto_id),
    productoCodigo: texto(p.producto_codigo),
    productoNombre: texto(p.producto_nombre),
    productoPrecioBase: p.producto_precio_base == null ? null : Number(p.producto_precio_base),
    porcentaje: Number(p.porcentaje ?? 0),
    nota: nullableTexto(p.nota),
    createdAt: nullableTexto(p.created_at) ?? undefined,
    updatedAt: nullableTexto(p.updated_at) ?? undefined,
  };
}

export const clienteDescuentoClient = {
  obtenerDescuentos: async (clienteId: string): Promise<DescuentosClienteResumen> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos`);
    const d = await respuestaApi<ApiRecord>(res, 'Error al cargar descuentos del cliente');
    const regiones = Array.isArray(d.regiones) ? d.regiones as ApiRecord[] : [];
    const categorias = Array.isArray(d.categorias) ? d.categorias as ApiRecord[] : [];
    const productos = Array.isArray(d.productos) ? d.productos as ApiRecord[] : [];
    return {
      clienteId: texto(d.clienteId),
      descuentoGeneral: d.descuentoGeneral != null ? Number(d.descuentoGeneral) : null,
      regiones: regiones.map(mapClienteRegion),
      categorias: categorias.map(mapClienteDescuentoCategoria),
      productos: productos.map(mapClienteDescuentoProducto),
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
    return mapClienteDescuentoCategoria(await respuestaApi<ApiRecord>(res, 'Error al asignar descuento de categoría'));
  },

  quitarCategoria: async (clienteId: string, descuentoId: string): Promise<void> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos/categoria/${descuentoId}`, {
      method: 'DELETE',
    });
    await respuestaApi<void>(res, 'Error al quitar descuento de categoría');
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
    return mapClienteDescuentoProducto(await respuestaApi<ApiRecord>(res, 'Error al asignar descuento de producto'));
  },

  quitarProducto: async (clienteId: string, descuentoId: string): Promise<void> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/descuentos/producto/${descuentoId}`, {
      method: 'DELETE',
    });
    await respuestaApi<void>(res, 'Error al quitar descuento de producto');
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
    return mapClienteRegion(await respuestaApi<ApiRecord>(res, 'Error al asignar región'));
  },

  quitarRegion: async (clienteId: string, sucursalId: string): Promise<void> => {
    const res = await apiFetch(`/api/clientes/${clienteId}/region/${sucursalId}`, {
      method: 'DELETE',
    });
    await respuestaApi<void>(res, 'Error al quitar región');
  },
};
