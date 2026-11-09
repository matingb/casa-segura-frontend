import { apiFetch } from '../apiFetch';
import type { Moneda } from '../types/Moneda';
import { respuestaApi } from './apiError';

export type CampoAumento = 'precio' | 'costo';
export type AjusteAumento =
  | { campo: CampoAumento; modo: 'porcentaje'; porcentaje: string }
  | { campo: CampoAumento; modo: 'importe'; moneda: Moneda; importe: string };
export type ImportesAumento = Record<string, Partial<Record<CampoAumento, string>>>;

export interface CriteriosAumento {
  alcance: 'productos' | 'stock';
  ajustes: AjusteAumento[];
  seleccion: 'todos' | 'filtrados';
  sucursalId: string | null;
  categoriaId: string | null;
  marca: string | null;
  proveedorId: string | null;
  incluirHeredados: boolean;
}

export interface FilaAumento {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  campos: Partial<Record<CampoAumento, ImporteAumento>>;
  motivo: string | null;
}

export interface ImporteAumento {
  moneda: Moneda;
  monedaAnterior: Moneda;
  anterior: string | null;
  heredado: boolean;
  editable: boolean;
  propuesta: string | null;
  motivo: string | null;
}

export interface VistaPreviaAumento {
  version: string;
  filas: FilaAumento[];
}

async function enviar<T>(ruta: string, datos: object, mensaje: string, signal?: AbortSignal) {
  const res = await apiFetch(`/api/productos/aumento-masivo${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
    signal,
  });
  return respuestaApi<T>(res, mensaje);
}

export const aumentoPreciosClient = {
  previsualizar: (criterios: CriteriosAumento, signal: AbortSignal) =>
    enviar<VistaPreviaAumento>('/vista-previa', criterios, 'No se pudo calcular la vista previa.', signal),
  aplicar: (criterios: CriteriosAumento, version: string,
    seleccion: { excluidos: string[] } | { soloIncluidos: string[] }, importes: ImportesAumento) =>
    enviar<{ actualizados: number }>('', { ...criterios, version, ...seleccion, importes }, 'No se pudieron aplicar los cambios.'),
};
