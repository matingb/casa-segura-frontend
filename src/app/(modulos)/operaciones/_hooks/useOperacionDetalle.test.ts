import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOperacionDetalle } from './useOperacionDetalle';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { OperacionDetalle } from '../../../../lib/types/OperacionDetalle';

vi.mock('../../../../lib/api/operaciones.client', () => ({
  operacionesClient: {
    obtenerPorId: vi.fn(),
  },
}));

describe('useOperacionDetalle', () => {
  const mockOperacion: OperacionDetalle = {
    id: 'op-1',
    fecha: '2026-08-15T12:00:00Z',
    tipoId: 't-1',
    tipoNombre: 'Venta',
    usuarioNombre: 'Nacho Romero',
    sucursalId: 's-1',
    sucursalNombre: 'Casa Central',
    total: 205700,
    subtotal: 170000,
    items: [
      {
        id: 'item-1',
        productoId: 'prod-1',
        productoCodigo: 'PROD-001',
        productoNombre: 'Cámara Exterior',
        cantidad: 3,
        precioUnitario: 45000,
        alicuotaIva: 21,
        iva: 28350,
        subtotal: 135000,
      },
    ],
    cuentas: [
      {
        id: 'oc-1',
        cuentaFinancieraId: 'cta-1',
        cuentaNombre: 'Efectivo',
        porcentaje: 60,
        monto: 123420,
      },
      {
        id: 'oc-2',
        cuentaFinancieraId: 'cta-2',
        cuentaNombre: 'Transferencia',
        porcentaje: 40,
        monto: 82280,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería cargar la operación correctamente', async () => {
    vi.mocked(operacionesClient.obtenerPorId).mockResolvedValue(mockOperacion);

    const { result } = renderHook(() => useOperacionDetalle('op-1'));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.operacion).toEqual(mockOperacion);
    expect(result.current.error).toBeNull();
    expect(operacionesClient.obtenerPorId).toHaveBeenCalledWith('op-1');
  });

  it('debería manejar error al fallar la carga', async () => {
    vi.mocked(operacionesClient.obtenerPorId).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useOperacionDetalle('op-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.operacion).toBeNull();
    expect(result.current.error).toBe('Fetch failed');
  });
});
