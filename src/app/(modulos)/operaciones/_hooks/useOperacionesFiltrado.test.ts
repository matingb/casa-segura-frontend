import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOperacionesFiltrado } from './useOperacionesFiltrado';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { tipoOperacionClient } from '../../../../lib/api/tipo-operacion.client';
import { Operacion } from '../../../../lib/types/Operacion';

vi.mock('../../../../lib/api/operaciones.client', () => ({
  operacionesClient: {
    obtenerPaginadoConTotal: vi.fn(),
    obtenerValoresUnicos: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/tipo-operacion.client', () => ({
  tipoOperacionClient: {
    obtenerTodos: vi.fn(),
  },
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

  beforeEach(() => {
    vi.clearAllMocks();
    (operacionesClient.obtenerPaginadoConTotal as any).mockResolvedValue({
      data: mockOperaciones,
      page: 1,
      totalPages: 1,
      total: 2,
    });
    (tipoOperacionClient.obtenerTodos as any).mockResolvedValue([
      { id: 't1', nombre: 'Venta' },
      { id: 't2', nombre: 'Compra' },
    ]);
    (operacionesClient.obtenerValoresUnicos as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería mostrar operaciones en la carga inicial y calcular totalMonto', async () => {
    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.operaciones).toHaveLength(2);
    expect(result.current.totalMonto).toBe(10000);
    expect(operacionesClient.obtenerPaginadoConTotal).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
        tipoId: undefined,
      })
    );
  });

  it('expone las opciones de tipo cargadas desde tipoOperacionClient', async () => {
    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    const labels = result.current.tipoOptions.map((o) => o.label);
    expect(labels).toContain('Venta');
    expect(labels).toContain('Compra');
  });

  it('permite filtrar por tipo (columna del FilterBar) enviando tipoId al backend y volver a página 1', async () => {
    const mockFiltrado = { data: [mockOperaciones[1]], page: 1, totalPages: 1, total: 1 };
    (operacionesClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockOperaciones, page: 1, totalPages: 1, total: 2 })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onFilterChange('tipo', 't2');
      await Promise.resolve();
    });

    expect(operacionesClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ tipoId: 't2', page: 1 })
    );
    expect(result.current.operaciones).toHaveLength(1);
    expect(result.current.operaciones[0].tipoId).toBe('t2');
    expect(result.current.totalMonto).toBe(-5000);
  });

  it('debería ordenar por columna: click asc, click desc, click sin orden (ciclo de 3 estados)', async () => {
    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('monto');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([{ sortBy: 'monto', sortDir: 'asc' }]);
    expect(operacionesClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [{ sortBy: 'monto', sortDir: 'asc' }], page: 1 })
    );

    await act(async () => {
      result.current.onSortChange('monto');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([{ sortBy: 'monto', sortDir: 'desc' }]);
    expect(operacionesClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [{ sortBy: 'monto', sortDir: 'desc' }] })
    );

    await act(async () => {
      result.current.onSortChange('monto');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([]);
  });

  it('debería permitir ordenar por múltiples columnas clickeando otra columna mientras hay un sort activo', async () => {
    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('sucursal');
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('fecha');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([
      { sortBy: 'sucursal', sortDir: 'asc' },
      { sortBy: 'fecha', sortDir: 'asc' },
    ]);
  });

  it('debería filtrar por columna enviando el filtro al backend y volver a página 1', async () => {
    const mockFiltrado = { data: [mockOperaciones[0]], page: 1, totalPages: 1, total: 1 };
    (operacionesClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockOperaciones, page: 1, totalPages: 1, total: 2 })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onFilterChange('usuario', 'Juan Perez');
      await Promise.resolve();
    });

    expect(operacionesClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ filtros: { usuario: 'Juan Perez' }, page: 1 })
    );
    expect(result.current.operaciones).toHaveLength(1);
    expect(result.current.operaciones[0].usuarioNombre).toBe('Juan Perez');
  });

  it('debería filtrar por sucursal como columna, reemplazando el selector anterior', async () => {
    const mockFiltrado = { data: [mockOperaciones[0]], page: 1, totalPages: 1, total: 1 };
    (operacionesClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockOperaciones, page: 1, totalPages: 1, total: 2 })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onFilterChange('sucursal', 'Sucursal Centro');
      await Promise.resolve();
    });

    expect(operacionesClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ filtros: { sucursal: 'Sucursal Centro' }, page: 1 })
    );
    expect(result.current.operaciones).toHaveLength(1);
  });

  it('debería cargar los valores únicos para los combobox de filtro (sucursal)', async () => {
    (operacionesClient.obtenerValoresUnicos as any).mockImplementation((campo: string) =>
      Promise.resolve(campo === 'sucursal' ? ['Sucursal Centro', 'Sucursal Norte'] : [])
    );

    const { result } = renderHook(() => useOperacionesFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.filterOptions.sucursal).toEqual([
      { value: 'Sucursal Centro', label: 'Sucursal Centro' },
      { value: 'Sucursal Norte', label: 'Sucursal Norte' },
    ]);
  });
});
