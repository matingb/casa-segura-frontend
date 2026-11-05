import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../apiFetch';
import { sucursalClient } from './sucursal.client';

vi.mock('../apiFetch', () => ({ apiFetch: vi.fn() }));

describe('sucursalClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('conserva NULL y la versión local de cotización en el mapeo', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: [
      { id: 's1', nombre: 'Casa Central', valor_dolar: null, valor_dolar_version: '0', activo: true },
    ] }), { status: 200 }));

    await expect(sucursalClient.obtenerTodas()).resolves.toMatchObject([
      { id: 's1', valorDolar: null, valorDolarVersion: '0', valorDolarActualizadaAt: null },
    ]);
  });

  it('mantiene código y status del conflicto de cotización del PDV', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response(JSON.stringify({
      status: 'error', code: 'COTIZACION_CAMBIO', message: 'La cotización cambió.',
    }), { status: 409 }));

    await expect(sucursalClient.actualizar('s1', { valor_dolar: null }))
      .rejects.toMatchObject({ code: 'COTIZACION_CAMBIO', status: 409 });
  });
});
