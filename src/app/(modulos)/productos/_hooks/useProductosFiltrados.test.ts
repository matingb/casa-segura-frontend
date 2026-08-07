import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProductosFiltrados } from './useProductosFiltrados';
import { productoClient } from '../../../../lib/api/producto.client';
import { Producto } from '../../../../lib/types/Producto';

vi.mock('../../../../lib/api/producto.client', () => ({
  productoClient: {
    obtenerTodos: vi.fn(),
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
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (productoClient.obtenerTodos as any).mockResolvedValue(mockProductos);
  });

  it('debería mostrar el catálogo completo de productos cuando el usuario no ha ingresado ninguna búsqueda', async () => {
    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.productos).toHaveLength(2);
    expect(result.current.productos).toEqual(mockProductos);
  });

  const busquedas = [
    { campo: 'código', termino: 'PROD-001', esperado: 'Taladro Percutor' },
    { campo: 'nombre', termino: 'Taladro', esperado: 'Taladro Percutor' },
    { campo: 'marca', termino: 'Stanley', esperado: 'Martillo' },
    { campo: 'modelo', termino: 'FatMax', esperado: 'Martillo' },
  ];

  busquedas.forEach(({ campo, termino, esperado }) => {
    it(`debería encontrar productos coincidiendo por ${campo} (buscando: "${termino}")`, async () => {
      const { result } = renderHook(() => useProductosFiltrados());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setBusqueda(termino);
      });

      expect(result.current.productos).toHaveLength(1);
      expect(result.current.productos[0].nombre).toBe(esperado);
    });
  });

  it('debería encontrar los productos independientemente de si el usuario busca usando mayúsculas o minúsculas', async () => {
    const { result } = renderHook(() => useProductosFiltrados());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.setBusqueda('   DeWALT   ');
    });

    expect(result.current.productos).toHaveLength(1);
    expect(result.current.productos[0].marca).toBe('DeWalt');
  });
});
