import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStockFiltrado } from './useStockFiltrado';
import { stockClient } from '../../../../lib/api/stock.client';
import { sucursalClient } from '../../../../lib/api/sucursal.client';
import { StockItem } from '../../../../lib/types/Stock';

vi.mock('../../../../lib/api/stock.client', () => ({
  stockClient: {
    obtenerPaginado: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/sucursal.client', () => ({
  sucursalClient: {
    obtenerTodas: vi.fn(),
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

  const mockSucursales = [
    { id: 's1', nombre: 'Sucursal Centro', esCentral: true, valorDolar: 1200 },
    { id: 's2', nombre: 'Sucursal Norte', esCentral: false, valorDolar: 1200 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (stockClient.obtenerPaginado as any).mockResolvedValue({
      data: mockStock,
      hasMore: false,
    });
    (sucursalClient.obtenerTodas as any).mockResolvedValue(mockSucursales);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería mostrar el stock completo en la carga inicial', async () => {
    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stock).toHaveLength(2);
    expect(result.current.stock).toEqual(mockStock);
  });

  it('setSearch dispara obtenerPaginado con el parámetro de búsqueda después del debounce', async () => {
    const mockFiltrado = { data: [mockStock[0]], hasMore: false };
    (stockClient.obtenerPaginado as any)
      .mockResolvedValueOnce({ data: mockStock, hasMore: false })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useStockFiltrado());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setSearch('PROD-001');
    });

    expect(stockClient.obtenerPaginado).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(stockClient.obtenerPaginado).toHaveBeenCalledTimes(2);
    expect(stockClient.obtenerPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'PROD-001' })
    );
    expect(result.current.stock).toHaveLength(1);
    expect(result.current.stock[0].nombre).toBe('Taladro Percutor');
  });

  it('el filtro de sucursal dispara obtenerPaginado con sucursalId en el backend', async () => {
    const mockStockS1 = { data: [mockStock[0]], hasMore: false };
    (stockClient.obtenerPaginado as any)
      .mockResolvedValueOnce({ data: mockStock, hasMore: false })
      .mockResolvedValueOnce(mockStockS1);

    const { result } = renderHook(() => useStockFiltrado());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.stock).toHaveLength(2);

    await act(async () => {
      result.current.setSucursalId('s1');
      await Promise.resolve();
    });

    expect(stockClient.obtenerPaginado).toHaveBeenCalledTimes(2);
    expect(stockClient.obtenerPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ sucursalId: 's1' })
    );
    expect(result.current.stock).toHaveLength(1);
    expect(result.current.stock[0].sucursalId).toBe('s1');
  });

  it('expone las opciones de sucursal cargadas desde el cliente de sucursales', async () => {
    const { result } = renderHook(() => useStockFiltrado());
    await act(async () => {
      await Promise.resolve();
    });

    const labels = result.current.sucursalOptions.map((o) => o.label);
    expect(labels).toContain('Todas las sucursales');
    expect(labels).toContain('Sucursal Centro');
    expect(labels).toContain('Sucursal Norte');
  });
});
