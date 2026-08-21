import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProductosFiltrados } from './useProductosFiltrados';
import { productoClient } from '../../../../lib/api/producto.client';
import { Producto } from '../../../../lib/types/Producto';

vi.mock('../../../../lib/api/producto.client', () => ({
  productoClient: {
    obtenerPaginadoConTotal: vi.fn(),
    obtenerValoresUnicos: vi.fn(),
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
      precioBase: 0,
      codigoQr: '',
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
      precioBase: 0,
      codigoQr: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (productoClient.obtenerPaginadoConTotal as any).mockResolvedValue({
      data: mockProductos,
      page: 1,
      totalPages: 1,
      total: 2,
    });
    (productoClient.obtenerValoresUnicos as any).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería mostrar el catálogo completo de productos en la carga inicial', async () => {
    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items).toEqual(mockProductos);
  });

  it('debería ordenar por columna: click asc, click desc, click sin orden (ciclo de 3 estados)', async () => {
    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([{ sortBy: 'nombre', sortDir: 'asc' }]);
    expect(productoClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [{ sortBy: 'nombre', sortDir: 'asc' }], page: 1 })
    );

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([{ sortBy: 'nombre', sortDir: 'desc' }]);
    expect(productoClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [{ sortBy: 'nombre', sortDir: 'desc' }] })
    );

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([]);
    expect(productoClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: [] })
    );
  });

  it('debería permitir ordenar por múltiples columnas clickeando otra columna mientras hay un sort activo', async () => {
    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('marca');
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onSortChange('nombre');
      await Promise.resolve();
    });

    expect(result.current.sort).toEqual([
      { sortBy: 'marca', sortDir: 'asc' },
      { sortBy: 'nombre', sortDir: 'asc' },
    ]);
    expect(productoClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sort: [
          { sortBy: 'marca', sortDir: 'asc' },
          { sortBy: 'nombre', sortDir: 'asc' },
        ],
      })
    );
  });

  it('debería filtrar por columna enviando el filtro al backend y volver a página 1', async () => {
    const mockFiltrado = { data: [mockProductos[0]], page: 1, totalPages: 1, total: 1 };
    (productoClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockProductos, page: 1, totalPages: 1, total: 2 })
      .mockResolvedValueOnce(mockFiltrado);

    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      result.current.onFilterChange('marca', 'DeWalt');
      await Promise.resolve();
    });

    expect(productoClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ filtros: { marca: 'DeWalt' }, page: 1 })
    );
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].nombre).toBe('Taladro Percutor');
  });

  it('debería cambiar de página con setPage', async () => {
    const masProductos: Producto[] = [
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
        precioBase: 0,
        codigoQr: '',
      },
    ];

    (productoClient.obtenerPaginadoConTotal as any)
      .mockResolvedValueOnce({ data: mockProductos, page: 1, totalPages: 2, total: 3 })
      .mockResolvedValueOnce({ data: masProductos, page: 2, totalPages: 2, total: 3 });

    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalPages).toBe(2);

    await act(async () => {
      result.current.setPage(2);
      await Promise.resolve();
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].nombre).toBe('Sierra Circular');
    expect(productoClient.obtenerPaginadoConTotal).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it('debería cargar los valores únicos para los combobox de filtro', async () => {
    (productoClient.obtenerValoresUnicos as any).mockImplementation((campo: string) =>
      Promise.resolve(campo === 'marca' ? ['DeWalt', 'Stanley'] : [])
    );

    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.filterOptions.marca).toEqual([
      { value: 'DeWalt', label: 'DeWalt' },
      { value: 'Stanley', label: 'Stanley' },
    ]);
  });
});
