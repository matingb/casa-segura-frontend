import { apiFetch } from '../apiFetch';
import { Cotizacion } from '../types/Moneda';
import { errorCatalogo } from './apiError';
export { CatalogoApiError, errorCatalogo } from './apiError';
export const cotizacionClient = {
  async obtener(sucursalId?: string | null): Promise<Cotizacion> {
    const query = sucursalId ? `?sucursal_id=${encodeURIComponent(sucursalId)}` : '';
    const res = await apiFetch(`/api/configuracion/cotizacion${query}`);
    if (!res.ok) return errorCatalogo(res, 'No se pudo consultar la cotización.');
    return (await res.json()).data;
  },
  async actualizar(valor: string, version: string): Promise<Cotizacion> {
    const res = await apiFetch('/api/configuracion/cotizacion', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cotizacion_usd_ars: valor, version_esperada: version }),
    });
    if (!res.ok) return errorCatalogo(res, 'No se pudo actualizar la cotización.');
    window.dispatchEvent(new CustomEvent('cotizacion-actualizada', { detail: { alcance: 'TENANT' } }));
    return (await res.json()).data;
  },
};
