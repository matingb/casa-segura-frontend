import { Operacion } from '../types/Operacion';
import { OperacionDetalle } from '../types/OperacionDetalle';
import { apiFetch } from '../apiFetch';

export function mapApiOperacionToOperacion(apiData: any): Operacion {
  return {
    id: apiData.id,
    sucursalId: apiData.sucursal_id ?? '',
    tipoId: apiData.tipo_id ?? '',
    tipoNombre: apiData.tipo_nombre ?? '',
    usuarioNombre: apiData.usuario_nombre ?? '',
    sucursalNombre: apiData.sucursal_nombre ?? '',
    monto: apiData.monto ? Number(apiData.monto) : 0,
    descripcion: apiData.descripcion ?? '',
    fecha: apiData.fecha ?? '',
  };
}

export function mapApiOperacionDetalleToOperacionDetalle(raw: any): OperacionDetalle {
  const total = raw.venta_total_ars !== null && raw.venta_total_ars !== undefined
    ? Number(raw.venta_total_ars)
    : raw.compra_total_ars !== null && raw.compra_total_ars !== undefined
    ? Number(raw.compra_total_ars)
    : raw.movimiento_monto_ars !== null && raw.movimiento_monto_ars !== undefined
    ? Number(raw.movimiento_monto_ars)
    : raw.monto ? Number(raw.monto) : 0;

  const items = Array.isArray(raw.items)
    ? raw.items.map((it: any) => {
        const precioUnitario = it.precio_unit_ars !== null && it.precio_unit_ars !== undefined 
          ? Number(it.precio_unit_ars) 
          : Number(it.costo_unit_ars ?? 0);
        const cantidad = Number(it.cantidad ?? 0);
        return {
          id: it.id,
          productoId: it.producto_id,
          productoCodigo: it.producto_codigo ?? '',
          productoNombre: it.producto_nombre ?? '',
          productoMarca: it.producto_marca ?? '',
          productoModelo: it.producto_modelo ?? '',
          productoImagenUrl: it.producto_imagen_url ?? '',
          cantidad,
          precioUnitario,
          costoUnitario: it.costo_unit_ars !== null && it.costo_unit_ars !== undefined ? Number(it.costo_unit_ars) : undefined,
          alicuotaIva: Number(it.alicuota_iva ?? 0),
          iva: Number(it.iva_ars ?? 0),
          subtotal: cantidad * precioUnitario,
        };
      })
    : [];

  const cuentas = Array.isArray(raw.cuentas)
    ? raw.cuentas.map((c: any) => ({
        id: c.id,
        cuentaFinancieraId: c.cuenta_financiera_id,
        cuentaNombre: c.cuenta_nombre ?? '',
        porcentaje: Number(c.porcentaje_venta ?? 0),
        porcentajeExtra: c.porcentaje_extra !== null && c.porcentaje_extra !== undefined ? Number(c.porcentaje_extra) : undefined,
        monto: Number(c.monto_ars ?? 0),
        montoUsd: c.monto_usd !== null && c.monto_usd !== undefined ? Number(c.monto_usd) : undefined,
      }))
    : [];

  return {
    id: raw.id,
    fecha: raw.fecha ?? '',
    tipoId: raw.tipo_id ?? '',
    tipoNombre: raw.tipo_nombre ?? '',
    usuarioNombre: raw.usuario_nombre ?? '',
    usuarioEmail: raw.usuario_email ?? '',
    sucursalId: raw.sucursal_id ?? '',
    sucursalNombre: raw.sucursal_nombre ?? '',
    total,
    subtotal: raw.venta_subtotal_ars ? Number(raw.venta_subtotal_ars) : (raw.compra_subtotal_ars ? Number(raw.compra_subtotal_ars) : undefined),
    descuento: raw.venta_descuento_ars ? Number(raw.venta_descuento_ars) : undefined,
    otrosImpuestos: raw.compra_otros_impuestos_ars ? Number(raw.compra_otros_impuestos_ars) : undefined,
    numeroFactura: raw.compra_numero_factura ?? undefined,
    numeroRemito: raw.compra_numero_remito ?? undefined,
    proveedorNombre: raw.proveedor_nombre ?? undefined,
    sucursalDestinoNombre: raw.sucursal_destino_nombre ?? undefined,
    costoFlete: raw.traslado_costo_flete_ars ? Number(raw.traslado_costo_flete_ars) : undefined,
    movimientoTipo: raw.movimiento_tipo ?? undefined,
    movimientoDescripcion: raw.movimiento_descripcion ?? undefined,
    items,
    cuentas,
  };
}

export const operacionesClient = {
  obtenerTodas: async (params?: {
    sucursalId?: string;
    tipoId?: string;
  }): Promise<Operacion[]> => {
    const searchParams = new URLSearchParams();
    if (params?.sucursalId) searchParams.set('sucursalId', params.sucursalId);
    if (params?.tipoId) searchParams.set('tipoId', params.tipoId);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res = await apiFetch(`/api/operaciones${queryString}`);
    if (!res.ok) throw new Error('Error al cargar operaciones');

    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiOperacionToOperacion);
    }
    return [];
  },

  obtenerPorId: async (id: string): Promise<OperacionDetalle | null> => {
    const res = await apiFetch(`/api/operaciones/${id}`);
    if (!res.ok) return null;

    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return mapApiOperacionDetalleToOperacionDetalle(json.data);
    }
    return null;
  },

  obtenerPaginado: async (params: {
    limit: number;
    offset: number;
    sucursalId?: string;
    tipoId?: string;
  }): Promise<{ data: Operacion[]; hasMore: boolean }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params.limit));
    searchParams.set('offset', String(params.offset));
    if (params.sucursalId) searchParams.set('sucursalId', params.sucursalId);
    if (params.tipoId) searchParams.set('tipoId', params.tipoId);

    const res = await apiFetch(`/api/operaciones?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar operaciones');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiOperacionToOperacion) : [],
      hasMore: json.page?.hasMore ?? false,
    };
  },
};

