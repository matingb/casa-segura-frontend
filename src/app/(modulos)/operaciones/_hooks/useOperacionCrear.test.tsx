import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOperacionCrear } from './useOperacionCrear';
import { CatalogoApiError } from '../../../../lib/api/cotizacion.client';
const mocks = vi.hoisted(() => ({ crear: vi.fn(), push: vi.fn(), notificar: vi.fn(), showError: vi.fn(), showSuccess: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../../../lib/api/operaciones.client', () => ({ operacionesClient: { crear: mocks.crear } }));
vi.mock('../../../../lib/api/sucursal.client', () => ({ notificarCotizacionSucursal: mocks.notificar }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => mocks }));
describe('Confirmación con cotización concurrente', () => {
  it('notifica el PDV tras un 409 para refrescar la referencia y conservar el formulario', async () => {
    mocks.crear.mockRejectedValue(new CatalogoApiError('Cambió el dólar', 'COTIZACION_CAMBIO', 409));
    const { result } = renderHook(() => useOperacionCrear());
    await act(async () => result.current.crear({ tipo: 'venta', sucursalId: 's', items: [], cuentas: [], venta: { totalArs: 0 } }));
    expect(mocks.notificar).toHaveBeenCalledOnce();
    expect(mocks.notificar.mock.calls).toEqual([['s']]);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Cambió el dólar');
    expect(result.current.submitting).toBe(false);
  });
});
