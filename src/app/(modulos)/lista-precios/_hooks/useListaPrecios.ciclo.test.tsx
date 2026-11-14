import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useListaPrecios } from './useListaPrecios';
import { ContextoMonetario } from '../../../../lib/types/Moneda';
import { StockItem } from '../../../../lib/types/Stock';
import { ItemConMargenCalculado, ListaPreciosSucursal } from '../../../../lib/types/ListaPreciosCliente';

const mocks = vi.hoisted(() => ({
  obtenerStock: vi.fn(),
  obtenerLista: vi.fn(),
  obtenerRegiones: vi.fn(),
  sucursales: [{ id: 's1', nombre: 'Centro', activo: true }, { id: 's2', nombre: 'Norte', activo: true }],
  getSubtipoNombre: (id: string) => id,
  contexto: {
    cotizacion_usd_ars: null,
    cotizacion_version: 'v1',
    actualizada_at: null,
    origen: 'TENANT' as const,
    sucursal_id: null,
  },
}));

vi.mock('../../../../context/SucursalContext', () => ({
  useSucursales: () => ({ sucursales: mocks.sucursales }),
}));
vi.mock('../../../../lib/hooks/useClasificacion', () => ({
  useClasificacion: () => ({ getSubtipoNombre: mocks.getSubtipoNombre }),
}));
vi.mock('../../../../lib/hooks/useCotizacionSucursal', () => ({
  useCotizacionSucursal: (id: string | null) => ({
    datos: id ? mocks.contexto : null,
    error: null,
    revision: id ? 1 : 0,
    cargando: false,
    recargar: vi.fn(),
  }),
}));
vi.mock('../../../../lib/api/stock.client', () => ({
  stockClient: { obtenerTodos: mocks.obtenerStock },
}));
vi.mock('../../../../lib/api/descuento-engine.client', () => ({
  descuentoEngineClient: { listaSucursal: mocks.obtenerLista },
}));
vi.mock('../../../../lib/api/region.client', () => ({
  regionClient: { obtenerPorSucursal: mocks.obtenerRegiones },
}));

const contexto = mocks.contexto as ContextoMonetario;

function stockItem(id: string, sucursalId = 's1', contextoMonetario = contexto): StockItem {
  return {
    id,
    productoId: `producto-${id}`,
    sucursalId,
    sucursalNombre: sucursalId === 's1' ? 'Centro' : 'Norte',
    codigo: `COD-${id}`,
    nombre: `Producto ${id}`,
    marca: 'Marca',
    modelo: 'Modelo',
    imagenUrl: '',
    subtipoId: 'subtipo',
    precioBase: 100,
    activo: true,
    costoReposicion: 50,
    precioVentaArs: 100,
    precioVentaUsd: null,
    contextoMonetario,
    iva: 21,
    margenMinimo: 0,
    descuento: null,
    stockMinimo: 0,
    cantidadDisponible: 1,
    cantidadReservada: 0,
  };
}

function precioItem(id: string, precioFinalArs: number | null = 90): ItemConMargenCalculado {
  return {
    id,
    productoId: `producto-${id}`,
    codigo: `COD-${id}`,
    nombre: `Producto ${id}`,
    subtipoNombre: 'subtipo',
    precioListaArs: 100,
    descuentoTotalPorcentaje: 10,
    precioFinalArs,
    precioFinalUsd: null,
    precioSinTope: 90,
    precioMinimo: 50,
    costoReposicion: 50,
    margenMinimo: 0,
    noAlcanzaMargen: false,
    descuentosDetalle: [],
  };
}

function listaPrecios(ids = ['ps1'], contextoLista = contexto, precioFinalArs: number | null = 90): ListaPreciosSucursal {
  return {
    items: ids.map((id) => precioItem(id, precioFinalArs)),
    contexto_monetario: contextoLista,
    sucursal: { id: 's1', nombre: 'Centro' },
    region: null,
  };
}

function pendiente<T>() {
  let resolver!: (value: T) => void;
  let rechazar!: (error: Error) => void;
  const promise = new Promise<T>((resolve, reject) => { resolver = resolve; rechazar = reject; });
  return { promise, resolver, rechazar };
}

const DOS_SUCURSALES = [
  { id: 's1', nombre: 'Centro', activo: true },
  { id: 's2', nombre: 'Norte', activo: true },
];

/** Con varios PDV se preselecciona el primero activo (s1). */
function renderConDosSucursales() {
  mocks.sucursales = DOS_SUCURSALES.map((sucursal) => ({ ...sucursal }));
  return renderHook(() => useListaPrecios());
}

describe('useListaPrecios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sucursales = [{ id: 's1', nombre: 'Centro', activo: true }];
    mocks.obtenerStock.mockImplementation(async ({ sucursalId }: { sucursalId: string }) => [stockItem(`${sucursalId}-producto`, sucursalId)]);
    mocks.obtenerLista.mockImplementation(async (sucursalId: string) => ({
      ...listaPrecios([`${sucursalId}-producto`]),
      sucursal: { id: sucursalId, nombre: sucursalId === 's1' ? 'Centro' : 'Norte' },
    }));
    mocks.obtenerRegiones.mockResolvedValue([]);
  });

  it('mantiene carga y bloquea filas/exportaciones mientras el cálculo está pendiente', async () => {
    const lenta = pendiente<ListaPreciosSucursal>();
    mocks.obtenerLista.mockReturnValue(lenta.promise);
    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => expect(mocks.obtenerStock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.obtenerLista).toHaveBeenCalledTimes(1));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.items).toEqual([]);
    expect(result.current.puedeExportar).toBe(false);

    await act(async () => { lenta.resolver(listaPrecios(['s1-producto'])); });
    await waitFor(() => expect(result.current.puedeExportar).toBe(true));
    expect(result.current.items).toHaveLength(1);
  });

  it('retira filas y bloquea la exportación ante un error de precios, con reintento explícito', async () => {
    mocks.obtenerLista.mockRejectedValueOnce(new Error('Error 500 de cálculo'));
    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => expect(result.current.error).toContain('Error 500'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(result.current.puedeExportar).toBe(false);
    expect(mocks.obtenerLista).toHaveBeenCalledTimes(1);

    act(() => result.current.reintentar());
    await waitFor(() => expect(result.current.puedeExportar).toBe(true));
    expect(mocks.obtenerLista).toHaveBeenCalledTimes(2);
  });

  it('no calcula silenciosamente si fallan regiones y permite una lista sin región si la respuesta exitosa está vacía', async () => {
    mocks.obtenerRegiones.mockRejectedValueOnce(new Error('Regiones sin conexión'));
    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => expect(result.current.error).toContain('Regiones sin conexión'));
    expect(mocks.obtenerLista).not.toHaveBeenCalled();
    expect(result.current.puedeExportar).toBe(false);

    mocks.obtenerRegiones.mockResolvedValueOnce([]);
    act(() => result.current.reintentar());
    await waitFor(() => expect(result.current.puedeExportar).toBe(true));
    expect(mocks.obtenerLista).toHaveBeenCalledWith('s1', null);
    expect(result.current.regionId).toBe('');
  });

  it('limita a un intento la recuperación de un mapa de precios incompleto', async () => {
    mocks.obtenerLista.mockResolvedValue({ ...listaPrecios([]), sucursal: { id: 's1', nombre: 'Centro' } });
    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => expect(result.current.error).toContain('contextos distintos o faltan precios'));
    expect(mocks.obtenerLista).toHaveBeenCalledTimes(2);
    expect(result.current.items).toEqual([]);
    expect(result.current.puedeExportar).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('limita la recuperación de contextos monetarios distintos y deja reintentar manualmente', async () => {
    const contextoIncompatible = { ...contexto, cotizacion_version: 'v2' };
    mocks.obtenerLista.mockResolvedValueOnce({
      ...listaPrecios(['s1-producto'], contextoIncompatible),
      sucursal: { id: 's1', nombre: 'Centro' },
    }).mockResolvedValueOnce({
      ...listaPrecios(['s1-producto'], contextoIncompatible),
      sucursal: { id: 's1', nombre: 'Centro' },
    }).mockResolvedValueOnce(listaPrecios(['s1-producto']));
    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => expect(result.current.error).toContain('contextos distintos o faltan precios'));
    expect(mocks.obtenerLista).toHaveBeenCalledTimes(2);
    act(() => result.current.reintentar());
    await waitFor(() => expect(result.current.puedeExportar).toBe(true));
    expect(mocks.obtenerLista).toHaveBeenCalledTimes(3);
  });

  it('conserva un precio final nulo que informó el backend', async () => {
    mocks.obtenerLista.mockResolvedValue({
      ...listaPrecios(['s1-producto'], contexto, null),
      sucursal: { id: 's1', nombre: 'Centro' },
    });
    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => expect(result.current.puedeExportar).toBe(true));
    expect(result.current.precios.get('s1-producto')?.precioFinalArs).toBeNull();
  });

  it('distingue una lista vacía válida de una carga incompleta', async () => {
    mocks.obtenerStock.mockResolvedValue([]);
    mocks.obtenerLista.mockResolvedValue({ ...listaPrecios([]), sucursal: { id: 's1', nombre: 'Centro' } });
    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => expect(mocks.obtenerLista).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.items).toEqual([]);
    expect(result.current.puedeExportar).toBe(false);
  });

  it('no vuelve a consultar por arrays equivalentes ni controles locales, pero sí cambia al seleccionar otro PDV', async () => {
    const { result, rerender } = renderConDosSucursales();
    await waitFor(() => expect(result.current.puedeExportar).toBe(true));
    const llamadasStock = mocks.obtenerStock.mock.calls.length;
    const llamadasLista = mocks.obtenerLista.mock.calls.length;
    const llamadasRegiones = mocks.obtenerRegiones.mock.calls.length;

    mocks.sucursales = mocks.sucursales.map((sucursal) => ({ ...sucursal }));
    rerender();
    act(() => {
      result.current.onSearchChange('producto');
      result.current.onSortChange('nombre');
      result.current.onFilterChange('marca', 'Marca');
    });
    await waitFor(() => expect(result.current.search).toBe('producto'));
    expect(mocks.obtenerStock).toHaveBeenCalledTimes(llamadasStock);
    expect(mocks.obtenerLista).toHaveBeenCalledTimes(llamadasLista);
    expect(mocks.obtenerRegiones).toHaveBeenCalledTimes(llamadasRegiones);

    act(() => result.current.onFilterChange('sucursal', 's2'));
    await waitFor(() => expect(result.current.puedeExportar).toBe(true));
    expect(mocks.obtenerStock).toHaveBeenCalledTimes(llamadasStock + 1);
    expect(mocks.obtenerLista).toHaveBeenCalledTimes(llamadasLista + 1);
    expect(mocks.obtenerRegiones).toHaveBeenCalledTimes(llamadasRegiones + 1);
  });

  it('descarta el primer resultado de A después de cambiar A→B→A', async () => {
    const primerPrecioA = pendiente<ListaPreciosSucursal>();
    const segundoPrecioA = pendiente<ListaPreciosSucursal>();
    let llamadasA = 0;
    mocks.obtenerLista.mockImplementation((sucursalId: string) => {
      if (sucursalId === 's1') {
        llamadasA += 1;
        return llamadasA === 1 ? primerPrecioA.promise : segundoPrecioA.promise;
      }
      return Promise.resolve({
        ...listaPrecios(['s2-producto']),
        sucursal: { id: 's2', nombre: 'Norte' },
      });
    });
    const { result } = renderConDosSucursales();
    await waitFor(() => expect(mocks.obtenerLista).toHaveBeenCalledWith('s1', null));

    act(() => result.current.onFilterChange('sucursal', 's2'));
    await waitFor(() => expect(mocks.obtenerLista).toHaveBeenCalledWith('s2', null));
    act(() => result.current.onFilterChange('sucursal', 's1'));
    await waitFor(() => expect(llamadasA).toBe(2));

    await act(async () => { primerPrecioA.resolver(listaPrecios(['s1-producto'], contexto, 10)); });
    expect(result.current.items).toEqual([]);
    expect(result.current.puedeExportar).toBe(false);

    await act(async () => { segundoPrecioA.resolver(listaPrecios(['s1-producto'], contexto, 20)); });
    await waitFor(() => expect(result.current.precios.get('s1-producto')?.precioFinalArs).toBe(20));
  });
});
