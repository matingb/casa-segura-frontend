import { apiFetch } from '../apiFetch';
import { errorCatalogo } from './cotizacion.client';
import { ContextoMonetario } from '../types/Moneda';
import { ListaPreciosCliente } from '../types/ListaPreciosCliente';
import { ResultadoCascada, AlertaMargen, AnalisisMargen } from '../utils/cascada-descuentos';

export interface EvaluarItemInput {
  productoSucursalId?: string;
  productoId?: string;
  precioManual?: number | null;
  cantidad?: number;
}

export interface EvaluacionItemResultado {
  productoSucursalId?: string;
  productoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  precioBase: number;
  precioSugerido: number;
  precioFinal: number;
  subtotal: number;
  descuentoEfectivo: number;
  resultadoCascada: ResultadoCascada;
  analisisMargen: AnalisisMargen;
  alertas: AlertaMargen[];
}

export interface ResumenEvaluacionOperacion {
  subtotalBase: number;
  totalFinal: number;
  descuentoTotalPesos: number;
  descuentoEfectivoTotal: number;
  gananciaTotalEstimada: number | null;
  margenEfectivoPromedio: number | null;
  hayAlertas: boolean;
  hayTopeAplicado: boolean;
  hayMargenPerforado: boolean;
  hayVentaEnPerdida: boolean;
  alertasGlobales: AlertaMargen[];
}

export interface EvaluacionOperacionResultado {
  contexto_monetario?: ContextoMonetario;
  sucursal: {
    id: string;
    nombre: string;
    descuento: number;
  };
  cliente: {
    id: string;
    nombre: string;
    descuentoHabitual: number | null;
    regionNombre: string | null;
    regionDescuento: number | null;
  } | null;
  items: EvaluacionItemResultado[];
  resumen: ResumenEvaluacionOperacion;
}

export const descuentoEngineClient = {
  listaCliente: async (sucursalId: string, clienteId: string): Promise<ListaPreciosCliente> => {
    const query = new URLSearchParams({ sucursalId, clienteId });
    const res = await apiFetch(`/api/descuentos/lista-cliente?${query}`);
    if (!res.ok) return errorCatalogo(res, 'No se pudo calcular la lista de precios.');
    return (await res.json()).data;
  },
  evaluarOperacion: async (
    sucursalId: string,
    items: EvaluarItemInput[],
    clienteId?: string | null,
    cotizacionVersion?: string
  ): Promise<EvaluacionOperacionResultado> => {
    const res = await apiFetch('/api/descuentos/evaluar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sucursalId,
        clienteId: clienteId || null,
        items,
        cotizacionVersion,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.status !== 'success' || !json.data) {
      throw new Error(json.message || 'Error al evaluar descuentos de la operación');
    }

    return json.data;
  },
};
