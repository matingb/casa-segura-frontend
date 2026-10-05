import { apiFetch } from '../apiFetch';
import { Cotizacion } from '../types/Moneda';
export class CatalogoApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) { super(message); }
}
export async function errorCatalogo(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new CatalogoApiError(body.message ?? fallback, body.code, res.status);
}
export const cotizacionClient = {
  async obtener(): Promise<Cotizacion> {
    const res = await apiFetch('/api/configuracion/cotizacion');
    if (!res.ok) return errorCatalogo(res, 'No se pudo consultar la cotización.');
    return (await res.json()).data;
  },
  async actualizar(valor: string, version: string): Promise<Cotizacion> {
    const res = await apiFetch('/api/configuracion/cotizacion', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacion_usd_ars: valor, version_esperada: version }),
    });
    if (!res.ok) return errorCatalogo(res, 'No se pudo actualizar la cotización.');
    window.dispatchEvent(new Event('cotizacion-actualizada'));
    return (await res.json()).data;
  },
};
