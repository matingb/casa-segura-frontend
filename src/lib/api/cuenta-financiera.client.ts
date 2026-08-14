import { CuentaFinanciera } from '../types/CuentaFinanciera';
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

  obtenerPorId: async (id: string): Promise<CuentaFinanciera | null> => {
    const res = await apiFetch(`/api/cuentas-financieras/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return mapApiToCuentaFinanciera(json.data);
    }
    return null;
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
