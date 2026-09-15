import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OperacionDetalle from './OperacionDetalle';
import { useOperacionDetalle } from '../../_hooks/useOperacionDetalle';
import { operacionesClient } from '../../../../../lib/api/operaciones.client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../_hooks/useOperacionDetalle', () => ({
  useOperacionDetalle: vi.fn(),
}));

vi.mock('../../../../../lib/api/operaciones.client', () => ({
  operacionesClient: {
    cancelar: vi.fn(),
    eliminarPago: vi.fn(),
  },
}));

vi.mock('../../../../../context/ToastContext', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

describe('OperacionDetalle', () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOperacionDetalle).mockReturnValue({
      operacion: {
        id: 'op-1',
        fecha: '2026-09-14T12:00:00Z',
        tipoId: 'tipo-venta',
        tipoNombre: 'Venta',
        usuarioNombre: 'Operador',
        sucursalId: 'sucursal-1',
        sucursalNombre: 'Central',
        total: 1000,
        montoPagado: 250,
        saldoPendiente: 750,
        estadoFinanciero: 'PARCIAL',
        items: [],
        cuentas: [{
          id: 'pago-1',
          cuentaFinancieraId: 'cuenta-1',
          cuentaNombre: 'Efectivo',
          porcentaje: 25,
          monto: 250,
        }],
      },
      isLoading: false,
      error: null,
      reload,
    });
    vi.mocked(operacionesClient.eliminarPago).mockResolvedValue({ id: 'op-1' } as any);
  });

  it('permite eliminar un cobro desde su tarjeta del historial', async () => {
    render(<OperacionDetalle operacionId="op-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cobro de $ 250,00 en Efectivo' }));
    const confirmar = screen.getByRole('button', { name: 'Eliminar cobro' });
    fireEvent.click(confirmar);

    await waitFor(() => {
      expect(operacionesClient.eliminarPago).toHaveBeenCalledWith('op-1', 'pago-1');
      expect(reload).toHaveBeenCalled();
    });
  });
});
