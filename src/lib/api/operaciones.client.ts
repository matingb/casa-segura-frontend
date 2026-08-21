import { Operacion } from '../types/Operacion';
import { OperacionDetalle } from '../types/OperacionDetalle';
import { OperacionCrearInput, OperacionItemInput, OperacionCuentaInput } from '../types/OperacionCrear';
import { apiFetch } from '../apiFetch';

function mapItemInputToApi(item: OperacionItemInput) {
  return {
    producto_sucursal_id: item.productoSucursalId,
    cantidad: item.cantidad,
    precio_unit_ars: item.precioUnitArs ?? null,
    precio_unit_usd: item.precioUnitUsd ?? null,
    costo_unit_ars: item.costoUnitArs ?? null,
    costo_unit_usd: item.costoUnitUsd ?? null,
    alicuota_iva: item.alicuotaIva ?? null,
    iva_ars: item.ivaArs ?? null,
    iva_usd: item.ivaUsd ?? null,
  };
}

function mapCuentaInputToApi(cuenta: OperacionCuentaInput) {
  return {
    cuenta_financiera_id: cuenta.cuentaFinancieraId,
    porcentaje_venta: cuenta.porcentajeVenta ?? null,
    // porcentaje_extra lo resuelve el backend desde la cuenta financiera.
    monto_ars: cuenta.montoArs ?? null,
    monto_usd: cuenta.montoUsd ?? null,
  };
}

export function mapOperacionCrearInputToApiBody(input: OperacionCrearInput): Record<string, unknown> {
  const base = {
    tipo: input.tipo,
    sucursal_id: input.sucursalId,
    fecha: input.fecha,
    modo_reparto: input.modoReparto ?? 'monto',
    cuentas: input.cuentas.map(mapCuentaInputToApi),
  };

  switch (input.tipo) {
    case 'compra':
      return {
        ...base,
        items: input.items.map(mapItemInputToApi),
        compra: {
          proveedor_id: input.compra.proveedorId,
          numero_remito: input.compra.numeroRemito ?? null,
          numero_factura: input.compra.numeroFactura ?? null,
          subtotal_ars: input.compra.subtotalArs ?? null,
          subtotal_usd: input.compra.subtotalUsd ?? null,
          otros_impuestos_ars: input.compra.otrosImpuestosArs ?? null,
          otros_impuestos_usd: input.compra.otrosImpuestosUsd ?? null,
          total_ars: input.compra.totalArs ?? null,
          total_usd: input.compra.totalUsd ?? null,
        },
      };
    case 'venta':
      return {
        ...base,
        items: input.items.map(mapItemInputToApi),
        venta: {
          numero_comprobante: input.venta.numeroComprobante ?? null,
          subtotal_ars: input.venta.subtotalArs ?? null,
          subtotal_usd: input.venta.subtotalUsd ?? null,
          descuento_ars: input.venta.descuentoArs ?? null,
          descuento_usd: input.venta.descuentoUsd ?? null,
          total_ars: input.venta.totalArs ?? null,
          total_usd: input.venta.totalUsd ?? null,
        },
      };
    case 'traslado':
      return {
        ...base,
        items: input.items.map(mapItemInputToApi),
        traslado: {
          sucursal_destino_id: input.traslado.sucursalDestinoId,
          costo_flete_ars: input.traslado.costoFleteArs ?? null,
        },
      };
    case 'movimiento':
      return {
        ...base,
        movimiento: {
          tipo: input.movimiento.tipo,
          descripcion: input.movimiento.descripcion ?? null,
          monto_ars: input.movimiento.montoArs,
          monto_usd: input.movimiento.montoUsd ?? null,
        },
      };
  }
}

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

  obtenerPaginadoConTotal: async (params: {
    page: number;
    limit: number;
    sucursalId?: string;
    tipoId?: string;
    sort?: { sortBy: string; sortDir: 'asc' | 'desc' }[];
    filtros?: Record<string, string>;
  }): Promise<{ data: Operacion[]; page: number; totalPages: number; total: number }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page));
    searchParams.set('limit', String(params.limit));
    if (params.sucursalId) searchParams.set('sucursalId', params.sucursalId);
    if (params.tipoId) searchParams.set('tipoId', params.tipoId);
    if (params.sort && params.sort.length > 0) {
      searchParams.set('sortBy', params.sort.map((c) => c.sortBy).join(','));
      searchParams.set('sortDir', params.sort.map((c) => c.sortDir).join(','));
    }
    if (params.filtros) {
      for (const [key, value] of Object.entries(params.filtros)) {
        if (value) searchParams.set(`filtro_${key}`, value);
      }
    }

    const res = await apiFetch(`/api/operaciones?${searchParams}`);
    if (!res.ok) throw new Error('Error al cargar operaciones');

    const json = await res.json();
    return {
      data: Array.isArray(json.data) ? json.data.map(mapApiOperacionToOperacion) : [],
      page: json.page?.page ?? 1,
      totalPages: json.page?.totalPages ?? 1,
      total: json.page?.total ?? 0,
    };
  },

  obtenerValoresUnicos: async (campo: string): Promise<string[]> => {
    const res = await apiFetch(`/api/operaciones/valores-unicos?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) throw new Error('Error al cargar valores únicos');
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  },

  crear: async (input: OperacionCrearInput): Promise<OperacionDetalle> => {
    const res = await apiFetch('/api/operaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapOperacionCrearInputToApiBody(input)),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al crear la operación');
    }
    const json = await res.json();
    return mapApiOperacionDetalleToOperacionDetalle(json.data);
  },
};

