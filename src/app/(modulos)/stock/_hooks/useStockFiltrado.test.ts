import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStockFiltrado } from './useStockFiltrado';
import { stockClient } from '../../../../lib/api/stock.client';
import { StockItem } from '../../../../lib/types/Stock';

vi.mock('../../../../lib/api/stock.client', () => ({
  stockClient: {
    obtenerTodos: vi.fn(),
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
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (stockClient.obtenerTodos as any).mockResolvedValue(mockStock);
  });

  it('debería mostrar el stock completo cuando el usuario no ha ingresado ninguna búsqueda', async () => {
    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.stock).toHaveLength(2);
    expect(result.current.stock).toEqual(mockStock);
  });

  const busquedas = [
    { campo: 'código', termino: 'PROD-001', esperado: 'Taladro Percutor' },
    { campo: 'nombre', termino: 'Taladro', esperado: 'Taladro Percutor' },
    { campo: 'marca', termino: 'Stanley', esperado: 'Martillo' },
    { campo: 'modelo', termino: 'FatMax', esperado: 'Martillo' },
    { campo: 'sucursal', termino: 'Centro', esperado: 'Taladro Percutor' },
  ];

  busquedas.forEach(({ campo, termino, esperado }) => {
    it(`debería encontrar items de stock coincidiendo por ${campo} (buscando: "${termino}")`, async () => {
      const { result } = renderHook(() => useStockFiltrado());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setBusqueda(termino);
      });

      expect(result.current.stock).toHaveLength(1);
      expect(result.current.stock[0].nombre).toBe(esperado);
    });
  });

  it('debería encontrar los items independientemente de si el usuario busca usando mayúsculas o minúsculas', async () => {
    const { result } = renderHook(() => useStockFiltrado());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.setBusqueda('   DeWALT   ');
    });

    expect(result.current.stock).toHaveLength(1);
    expect(result.current.stock[0].marca).toBe('DeWalt');
  });
});
