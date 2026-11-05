import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCotizacionSucursal } from './useCotizacionSucursal';

const { obtener } = vi.hoisted(() => ({ obtener: vi.fn() }));
vi.mock('../api/cotizacion.client', () => ({ cotizacionClient: { obtener } }));

function pendiente<T>() {
  let resolver!: (value: T) => void;
  const promise = new Promise<T>((resolve) => { resolver = resolve; });
  return { promise, resolver };
}

interface RespuestaTest {
  sucursal_id: string;
  cotizacion_usd_ars: string;
  cotizacion_version: string;
}

describe('useCotizacionSucursal', () => {
  it('descarta la respuesta atrasada del PDV anterior', async () => {
    const anterior = pendiente<RespuestaTest>();
    const actual = pendiente<RespuestaTest>();
    obtener.mockImplementation((id: string) => id === 's1' ? anterior.promise : actual.promise);
    const { result, rerender } = renderHook(({ id }) => useCotizacionSucursal(id), { initialProps: { id: 's1' } });

    rerender({ id: 's2' });
    await act(async () => { anterior.resolver({ sucursal_id: 's1', cotizacion_usd_ars: '1200', cotizacion_version: 'token-s1' }); });
    expect(result.current.datos).toBeNull();

    await act(async () => { actual.resolver({ sucursal_id: 's2', cotizacion_usd_ars: '1300', cotizacion_version: 'token-s2' }); });
    expect(result.current.datos).toMatchObject({ sucursal_id: 's2', cotizacion_usd_ars: '1300', cotizacion_version: 'token-s2' });
  });
});
