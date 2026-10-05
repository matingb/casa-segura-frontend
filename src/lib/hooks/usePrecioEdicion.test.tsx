import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePrecioEdicion } from './usePrecioEdicion';
import { PrecioResuelto } from '../types/Moneda';

const contexto = { cotizacion_usd_ars: '1200.000000', cotizacion_version: '3', actualizada_at: null };
describe('Borrador del precio principal', () => {
  it('un stock sin precio sigue vacío aunque el producto tenga sugerencia global', () => {
    const source = { precioVentaArs: null, precioBase: 123, precio: { moneda_referencia: 'ARS', importe_referencia: null, ars: null, usd: null, estado: 'SIN_PRECIO' } as PrecioResuelto };
    const { result } = renderHook(() => usePrecioEdicion(source));
    expect(result.current.precio).toMatchObject({ importe: '', cambiado: false });
    const legado = renderHook(() => usePrecioEdicion({ precioVentaArs: null, precioBase: 123 }));
    expect(legado.result.current.precio.importe).toBe('');
  });
  it('carga el detalle asíncrono y conserva el borrador al volver a renderizarlo', () => {
    const source = { precioBase: 123, contextoMonetario: contexto };
    const { result, rerender } = renderHook(({ detalle }) => usePrecioEdicion(detalle), { initialProps: { detalle: undefined as typeof source | undefined } });
    rerender({ detalle: source });
    expect(result.current.precio.importe).toBe('123');
    act(() => result.current.setPrecio({ ...result.current.precio, importe: '456', cambiado: true }));
    rerender({ detalle: source });
    expect(result.current.precio).toMatchObject({ importe: '456', cambiado: true, contexto });
  });
});
