import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogoApiError } from './apiError';
import { clienteDescuentoClient } from './cliente-descuento.client';

describe('clienteDescuentoClient errores HTTP', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    [404, 'RECURSO_NO_DISPONIBLE', 'El cliente no está disponible'],
    [500, 'ERROR_INTERNO', 'No se pudieron cargar los descuentos'],
  ])('conserva status, code y mensaje de HTTP %i', async (status, code, message) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      status: 'error',
      code,
      message,
    }), { status }));

    await expect(clienteDescuentoClient.obtenerDescuentos('c1')).rejects.toMatchObject({
      name: 'CatalogoApiError',
      status,
      code,
      message,
    });
  });

  it('preserva el error de transporte para permitir una recuperación manual', async () => {
    const fallo = new TypeError('Failed to fetch');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(fallo);

    await expect(clienteDescuentoClient.obtenerDescuentos('c1')).rejects.toBe(fallo);
    expect(fallo).not.toBeInstanceOf(CatalogoApiError);
  });
});
