import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOperacionCrear } from './useOperacionCrear';
import { CatalogoApiError } from '../../../../lib/api/cotizacion.client';
const mocks = vi.hoisted(() => ({ crear: vi.fn(), push: vi.fn(), recargar: vi.fn(), showError: vi.fn(), showSuccess: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../../../lib/api/operaciones.client', () => ({ operacionesClient: { crear: mocks.crear } }));
vi.mock('../../../../context/CotizacionContext', () => ({ useCotizacion: () => ({ recargar: mocks.recargar }) }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => mocks }));
describe('Confirmación con cotización concurrente', () => {
  it('recarga la referencia tras un 409 y conserva el formulario para revisar', async () => {
    mocks.crear.mockRejectedValue(new CatalogoApiError('Cambió el dólar', 'COTIZACION_CAMBIO', 409));
    const { result } = renderHook(() => useOperacionCrear());
    await act(async () => result.current.crear({ tipo: 'venta', sucursalId: 's', items: [], cuentas: [], venta: { totalArs: 0 } }));
    expect(mocks.recargar).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Cambió el dólar');
    expect(result.current.submitting).toBe(false);
  });
});
