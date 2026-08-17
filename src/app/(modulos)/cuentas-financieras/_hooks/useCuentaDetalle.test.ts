import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCuentaDetalle } from './useCuentaDetalle';
import { cuentaFinancieraClient } from '../../../../lib/api/cuenta-financiera.client';
import { CuentaFinanciera } from '../../../../lib/types/CuentaFinanciera';
import { MovimientoCuenta } from '../../../../lib/types/MovimientoCuenta';

vi.mock('../../../../lib/api/cuenta-financiera.client', () => ({
  cuentaFinancieraClient: {
    obtenerPorId: vi.fn(),
    obtenerMovimientos: vi.fn(),
  },
}));

describe('useCuentaDetalle', () => {
  const mockCuenta: CuentaFinanciera = {
    id: 'c-1',
    nombre: 'Efectivo',
    saldoInicial: 50000,
    saldoActual: 173420,
    porcentajeExtra: 0,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  const mockMovimientos: MovimientoCuenta[] = [
    {
      id: 'oc-1',
      operacionId: 'op-1',
      cuentaFinancieraId: 'c-1',
      fecha: '2026-08-15T12:00:00Z',
      descripcion: 'Venta B-0001-00000234',
      tipo: 'Venta',
      monto: 123420,
      comprobante: 'B-0001-00000234',
      usuarioNombre: 'Nacho',
      sucursalNombre: 'Casa Central',
    },
  ];


  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería cargar la cuenta y sus movimientos correctamente', async () => {
    vi.mocked(cuentaFinancieraClient.obtenerPorId).mockResolvedValue(mockCuenta);
    vi.mocked(cuentaFinancieraClient.obtenerMovimientos).mockResolvedValue(mockMovimientos);

    const { result } = renderHook(() => useCuentaDetalle('c-1'));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.cuenta).toEqual(mockCuenta);
    expect(result.current.movimientos).toEqual(mockMovimientos);
    expect(result.current.error).toBeNull();
    expect(cuentaFinancieraClient.obtenerPorId).toHaveBeenCalledWith('c-1');
    expect(cuentaFinancieraClient.obtenerMovimientos).toHaveBeenCalledWith('c-1');
  });

  it('debería retornar movimientos vacíos para una cuenta sin movimientos', async () => {
    vi.mocked(cuentaFinancieraClient.obtenerPorId).mockResolvedValue(mockCuenta);
    vi.mocked(cuentaFinancieraClient.obtenerMovimientos).mockResolvedValue([]);

    const { result } = renderHook(() => useCuentaDetalle('c-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.movimientos).toEqual([]);
  });

  it('debería capturar el error si la petición falla', async () => {
    vi.mocked(cuentaFinancieraClient.obtenerPorId).mockRejectedValue(new Error('Network error'));
    vi.mocked(cuentaFinancieraClient.obtenerMovimientos).mockResolvedValue([]);

    const { result } = renderHook(() => useCuentaDetalle('c-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Network error');
  });
});
