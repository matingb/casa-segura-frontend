import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStockFiltrado } from './useStockFiltrado';
import { stockClient } from '../../../../lib/api/stock.client';
import { StockItem } from '../../../../lib/types/Stock';

vi.mock('../../../../lib/api/stock.client', () => ({
  stockClient: {
    obtenerPaginadoConTotal: vi.fn(),
    obtenerValoresUnicos: vi.fn(),
  },
}));

describe('Filtro de Stock (useStockFiltrado)', () => {
  const mockStock: StockItem[] = [
    {
      id: '1',
      productoId: 'p1',
      sucursalId: 's1',
      sucursalNombre: 'Sucursal Centro',
      codigo: 'PROD-001',
      nombre: 'Taladro Percutor',
      marca: 'DeWalt',
      modelo: 'DWD520',
      imagenUrl: '',
      subtipoId: 'herr',
      precioBase: 0,
      activo: true,
      costoReposicion: 1000,
      precioVentaArs: 1500,
      precioVentaUsd: 1.5,
      iva: 21,
      margenMinimo: 10,
      stockMinimo: 5,
      cantidadDisponible: 10,
      cantidadReservada: 2,
    },
    {
      id: '2',
      productoId: 'p2',
      sucursalId: 's2',
      sucursalNombre: 'Sucursal Norte',
      codigo: 'PROD-002',
      nombre: 'Martillo',
      marca: 'Stanley',
      modelo: 'FatMax',
      imagenUrl: '',
      subtipoId: 'herr',
      precioBase: 0,
      activo: true,
      costoReposicion: 500,
      precioVentaArs: 800,
      precioVentaUsd: 0.8,
      iva: 21,
      margenMinimo: 15,
      stockMinimo: 10,
      cantidadDisponible: 50,
      cantidadReservada: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (stockClient.obtenerPaginadoConTotal as any).mockResolvedValue({
      data: mockStock,
      page: 1,
      totalPages: 1,
      total: 2,
    });
    (stockClient.obtenerValoresUnicos as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería mostrar el stock completo en la carga inicial', async () => {
    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stock).toHaveLength(2);
    expect(result.current.stock).toEqual(mockStock);
  });

  it('debería cambiar de página con setPage', async () => {
    const mockPagina2 = { data: [mockStock[1]], page: 2, totalPages: 2, total: 3 };
    (stockClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockStock, page: 1, totalPages: 2, total: 3 })
      .mockResolvedValueOnce(mockPagina2);

    const { result } = renderHook(() => useStockFiltrado());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.totalPages).toBe(2);

    await act(async () => {
      result.current.setPage(2);
      await Promise.resolve();
    });

    expect(stockClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    );
    expect(result.current.stock).toHaveLength(1);
  });

  it('debería ordenar por columna: click asc, click desc, click sin orden (ciclo de 3 estados)', async () => {
    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([{ sortBy: 'nombre', sortDir: 'asc' }]);
    expect(stockClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [{ sortBy: 'nombre', sortDir: 'asc' }], page: 1 })
    );

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([{ sortBy: 'nombre', sortDir: 'desc' }]);
    expect(stockClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [{ sortBy: 'nombre', sortDir: 'desc' }] })
    );

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([]);
  });

  it('debería permitir ordenar por múltiples columnas clickeando otra columna mientras hay un sort activo', async () => {
    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('sucursal');
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([
      { sortBy: 'sucursal', sortDir: 'asc' },
      { sortBy: 'nombre', sortDir: 'asc' },
    ]);
  });

  it('debería filtrar por columna enviando el filtro al backend y volver a página 1', async () => {
    const mockFiltrado = { data: [mockStock[0]], page: 1, totalPages: 1, total: 1 };
    (stockClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockStock, page: 1, totalPages: 1, total: 2 })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onFilterChange('marca', 'DeWalt');
      await Promise.resolve();
    });

    expect(stockClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ filtros: { marca: 'DeWalt' }, page: 1 })
    );
    expect(result.current.stock).toHaveLength(1);
    expect(result.current.stock[0].nombre).toBe('Taladro Percutor');
  });

  it('debería filtrar por sucursal como columna, reemplazando el selector anterior', async () => {
    const mockFiltrado = { data: [mockStock[0]], page: 1, totalPages: 1, total: 1 };
    (stockClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockStock, page: 1, totalPages: 1, total: 2 })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onFilterChange('sucursal', 'Sucursal Centro');
      await Promise.resolve();
    });

    expect(stockClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ filtros: { sucursal: 'Sucursal Centro' }, page: 1 })
    );
    expect(result.current.stock).toHaveLength(1);
  });

  it('debería cargar los valores únicos para los combobox de filtro', async () => {
    (stockClient.obtenerValoresUnicos as any).mockImplementation((campo: string) =>
      Promise.resolve(campo === 'marca' ? ['DeWalt', 'Stanley'] : [])
    );

    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.filterOptions.marca).toEqual([
      { value: 'DeWalt', label: 'DeWalt' },
      { value: 'Stanley', label: 'Stanley' },
    ]);
  });
});
