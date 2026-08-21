import { CuentaFinanciera } from '../types/CuentaFinanciera';
import { MovimientoCuenta } from '../types/MovimientoCuenta';
import { apiFetch } from '../apiFetch';

export function mapApiToCuentaFinanciera(raw: any): CuentaFinanciera {
  return {
    id:              raw.id,
    nombre:          raw.nombre ?? '',
    saldoInicial:    raw.saldo_inicial  !== undefined ? Number(raw.saldo_inicial)  : 0,
    saldoActual:     raw.saldo_actual   !== undefined ? Number(raw.saldo_actual)   : 0,
    porcentajeExtra: raw.porcentaje_extra !== undefined ? Number(raw.porcentaje_extra) : 0,
    createdAt:       raw.created_at ?? '',
    updatedAt:       raw.updated_at ?? '',
  };
}

export function mapApiToMovimientoCuenta(raw: any): MovimientoCuenta {
  return {
    id:                 raw.id,
    operacionId:        raw.operacion_id ?? '',
    cuentaFinancieraId: raw.cuenta_financiera_id ?? '',
    fecha:              raw.fecha ?? '',
    descripcion:        raw.descripcion ?? raw.tipo_nombre ?? raw.tipo ?? '—',
    monto:              raw.monto_ars !== undefined && raw.monto_ars !== null ? Number(raw.monto_ars) : (raw.monto !== undefined ? Number(raw.monto) : 0),
    montoUsd:           raw.monto_usd !== undefined && raw.monto_usd !== null ? Number(raw.monto_usd) : undefined,
    porcentajeVenta:    raw.porcentaje_venta !== undefined && raw.porcentaje_venta !== null ? Number(raw.porcentaje_venta) : undefined,
    porcentajeExtra:    raw.porcentaje_extra !== undefined && raw.porcentaje_extra !== null ? Number(raw.porcentaje_extra) : undefined,
    tipo:               raw.tipo_nombre ?? raw.tipo,
    usuarioNombre:      raw.usuario_nombre ?? '',
    sucursalNombre:     raw.sucursal_nombre ?? '',
    comprobante:         raw.comprobante ?? '',
  };
}


export const cuentaFinancieraClient = {
  obtenerTodas: async (): Promise<CuentaFinanciera[]> => {
    const res = await apiFetch('/api/cuentas-financieras');
    if (!res.ok) throw new Error('Error al cargar cuentas financieras');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiToCuentaFinanciera);
    }
    return [];
  },

  obtenerTodasFiltradas: async (params?: {
    sort?: { sortBy: string; sortDir: 'asc' | 'desc' }[];
    filtros?: Record<string, string>;
  }): Promise<CuentaFinanciera[]> => {
    const searchParams = new URLSearchParams();
    if (params?.sort && params.sort.length > 0) {
      searchParams.set('sortBy', params.sort.map((c) => c.sortBy).join(','));
      searchParams.set('sortDir', params.sort.map((c) => c.sortDir).join(','));
    }
    if (params?.filtros) {
      for (const [key, value] of Object.entries(params.filtros)) {
        if (value) searchParams.set(`filtro_${key}`, value);
      }
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res = await apiFetch(`/api/cuentas-financieras${queryString}`);
    if (!res.ok) throw new Error('Error al cargar cuentas financieras');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiToCuentaFinanciera);
    }
    return [];
  },

  obtenerValoresUnicos: async (campo: string): Promise<string[]> => {
    const res = await apiFetch(`/api/cuentas-financieras/valores-unicos?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) throw new Error('Error al cargar valores únicos');
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  },

  obtenerPorId: async (id: string): Promise<CuentaFinanciera | null> => {
    const res = await apiFetch(`/api/cuentas-financieras/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return mapApiToCuentaFinanciera(json.data);
    }
    return null;
  },

  obtenerMovimientos: async (id: string): Promise<MovimientoCuenta[]> => {
    const res = await apiFetch(`/api/cuentas-financieras/${id}/movimientos`);
    if (!res.ok) throw new Error('Error al cargar movimientos de la cuenta');
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiToMovimientoCuenta);
    }
    return [];
  },

  crear: async (data: {
    nombre: string;
    saldo_inicial: number;
    porcentaje_extra: number;
  }): Promise<CuentaFinanciera> => {
    const res = await apiFetch('/api/cuentas-financieras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al crear cuenta financiera');
    }
    const json = await res.json();
    return mapApiToCuentaFinanciera(json.data);
  },

  actualizar: async (
    id: string,
    data: {
      nombre?: string;
      saldo_inicial?: number;
      porcentaje_extra?: number;
    }
  ): Promise<CuentaFinanciera> => {
    const res = await apiFetch(`/api/cuentas-financieras/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? 'Error al actualizar cuenta financiera');
    }
    const json = await res.json();
    return mapApiToCuentaFinanciera(json.data);
  },
};

