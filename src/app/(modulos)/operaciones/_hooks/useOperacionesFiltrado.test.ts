import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOperacionesFiltrado } from './useOperacionesFiltrado';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { useSucursales } from '../../../../context/SucursalContext';
import { Operacion } from '../../../../lib/types/Operacion';

vi.mock('../../../../lib/api/operaciones.client', () => ({
  operacionesClient: {
    obtenerPaginado: vi.fn(),
  },
}));

vi.mock('../../../../context/SucursalContext', () => ({
  useSucursales: vi.fn(),
}));

describe('useOperacionesFiltrado', () => {
  const mockOperaciones: Operacion[] = [
    {
      id: 'op-1',
      sucursalId: 's1',
      tipoId: 't1',
      tipoNombre: 'Venta',
      usuarioNombre: 'Juan Perez',
      sucursalNombre: 'Sucursal Centro',
      monto: 15000,
      descripcion: 'Venta de taladro',
      fecha: '2026-08-17T10:00:00Z',
    },
    {
      id: 'op-2',
      sucursalId: 's2',
      tipoId: 't2',
      tipoNombre: 'Compra',
      usuarioNombre: 'Maria Gomez',
      sucursalNombre: 'Sucursal Norte',
      monto: -5000,
      descripcion: 'Compra insumos',
      fecha: '2026-08-17T11:00:00Z',
    },
  ];

  const mockSucursales = [
    { id: 's1', nombre: 'Sucursal Centro', esCentral: true, valorDolar: 1200 },
    { id: 's2', nombre: 'Sucursal Norte', esCentral: false, valorDolar: 1200 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (operacionesClient.obtenerPaginado as any).mockResolvedValue({
      data: mockOperaciones,
      hasMore: false,
    });
    vi.mocked(useSucursales).mockReturnValue({
      sucursales: mockSucursales as any,
      sucursalOptions: [
        { value: '', label: 'Todas las sucursales' },
        { value: 's1', label: 'Sucursal Centro' },
        { value: 's2', label: 'Sucursal Norte' },
      ],
      isLoading: false,
      error: null,
      recargarSucursales: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería mostrar operaciones en la carga inicial y calcular totalMonto', async () => {
    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.operaciones).toHaveLength(2);
    expect(result.current.totalMonto).toBe(10000);
    expect(operacionesClient.obtenerPaginado).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      search: undefined,
      sucursalId: undefined,
    });
  });

  it('debería filtrar por sucursal enviando sucursalId al backend', async () => {
    const mockFiltrado = { data: [mockOperaciones[0]], hasMore: false };
    (operacionesClient.obtenerPaginado as any)
      .mockResolvedValueOnce({ data: mockOperaciones, hasMore: false })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.operaciones).toHaveLength(2);

    await act(async () => {
      result.current.setSucursalId('s1');
      await Promise.resolve();
    });

    expect(operacionesClient.obtenerPaginado).toHaveBeenCalledTimes(2);
    expect(operacionesClient.obtenerPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ sucursalId: 's1' })
    );
    expect(result.current.operaciones).toHaveLength(1);
    expect(result.current.operaciones[0].sucursalId).toBe('s1');
    expect(result.current.totalMonto).toBe(15000);
  });

  it('expone las opciones de sucursal provistas por el SucursalContext', async () => {
    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    const labels = result.current.sucursalOptions.map((o) => o.label);
    expect(labels).toContain('Todas las sucursales');
    expect(labels).toContain('Sucursal Centro');
    expect(labels).toContain('Sucursal Norte');
  });

  it('permite filtrar por tipo y recalcula totalMonto', async () => {
    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setTipoId('t2');
    });

    expect(result.current.operaciones).toHaveLength(1);
    expect(result.current.operaciones[0].tipoId).toBe('t2');
    expect(result.current.totalMonto).toBe(-5000);
  });
});
