import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProductosFiltrados } from './useProductosFiltrados';
import { productoClient } from '../../../../lib/api/producto.client';
import { Producto } from '../../../../lib/types/Producto';

vi.mock('../../../../lib/api/producto.client', () => ({
  productoClient: {
    obtenerPaginado: vi.fn(),
  },
}));

describe('Filtro de Catálogo (useProductosFiltrados)', () => {
  const mockProductos: Producto[] = [
    {
      id: '1',
      codigo: 'PROD-001',
      nombre: 'Taladro Percutor',
      marca: 'DeWalt',
      modelo: 'DWD520',
      subtipoId: 'herr',
      codigoBarraProveedor: '',
      color: '',
      presentacion: '',
      alto: 0,
      ancho: 0,
      profundidad: 0,
      pesoUnitario: 0,
      imagenUrl: '',
      descripcion: '',
      activo: true,
    },
    {
      id: '2',
      codigo: 'PROD-002',
      nombre: 'Martillo',
      marca: 'Stanley',
      modelo: 'FatMax',
      subtipoId: 'herr',
      codigoBarraProveedor: '',
      color: '',
      presentacion: '',
      alto: 0,
      ancho: 0,
      profundidad: 0,
      pesoUnitario: 0,
      imagenUrl: '',
      descripcion: '',
      activo: true,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (productoClient.obtenerPaginado as any).mockResolvedValue({
      data: mockProductos,
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería mostrar el catálogo completo de productos en la carga inicial', async () => {
    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items).toEqual(mockProductos);
  });

  it('debería realizar búsqueda server-side cuando se cambia search con debounce', async () => {
    const mockFiltrado = [{ ...mockProductos[0] }];
    (productoClient.obtenerPaginado as any)
      .mockResolvedValueOnce({ data: mockProductos, hasMore: false })
      .mockResolvedValueOnce({ data: mockFiltrado, hasMore: false });

    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.setSearch('Taladro');
    });

    // Antes de vencer el debounce
    expect(productoClient.obtenerPaginado).toHaveBeenCalledTimes(1);

    // Avanzar temporizador del debounce (300ms)
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(productoClient.obtenerPaginado).toHaveBeenCalledTimes(2);
    expect(productoClient.obtenerPaginado).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Taladro' })
    );
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].nombre).toBe('Taladro Percutor');
  });

  it('debería permitir cargar más elementos con loadMore', async () => {
    const masProductos: Producto[] = [
      ...mockProductos,
      {
        id: '3',
        codigo: 'PROD-003',
        nombre: 'Sierra Circular',
        marca: 'Bosch',
        modelo: 'GKS 150',
        subtipoId: 'herr',
        codigoBarraProveedor: '',
        color: '',
        presentacion: '',
        alto: 0,
        ancho: 0,
        profundidad: 0,
        pesoUnitario: 0,
        imagenUrl: '',
        descripcion: '',
        activo: true,
      },
    ];

    (productoClient.obtenerPaginado as any)
      .mockResolvedValueOnce({ data: mockProductos, hasMore: true })
      .mockResolvedValueOnce({ data: masProductos, hasMore: false });

    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
  });
});
