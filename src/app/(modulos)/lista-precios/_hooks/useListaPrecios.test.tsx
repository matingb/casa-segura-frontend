import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useListaPrecios } from './useListaPrecios';
import { descuentoEngineClient } from '../../../../lib/api/descuento-engine.client';
import { regionClient } from '../../../../lib/api/region.client';
import { stockClient } from '../../../../lib/api/stock.client';

let sucursalesMock = [
  { id: 'suc-1', nombre: 'Sucursal Central', activo: true },
  { id: 'suc-2', nombre: 'Sucursal Norte', activo: true },
];

vi.mock('../../../../context/SucursalContext', () => ({
  useSucursales: () => ({
    sucursales: sucursalesMock,
  }),
}));

vi.mock('../../../../lib/api/stock.client', () => ({
  stockClient: {
    obtenerTodos: vi.fn(),
  },
}));

vi.mock('../../../../lib/hooks/useClasificacion', () => ({
  useClasificacion: () => ({ getSubtipoNombre: () => 'General' }),
}));

vi.mock('../../../../lib/hooks/useCotizacionSucursal', () => ({
  useCotizacionSucursal: () => ({ revision: 0, error: null }),
}));

vi.mock('../../../../lib/api/descuento-engine.client', () => ({
  descuentoEngineClient: {
    listaSucursal: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/region.client', () => ({
  regionClient: {
    obtenerPorSucursal: vi.fn(),
  },
}));

describe('useListaPrecios con selección por defecto y selector de región', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    sucursalesMock = [
      { id: 'suc-1', nombre: 'Sucursal Central', activo: true },
      { id: 'suc-2', nombre: 'Sucursal Norte', activo: true },
    ];

    vi.mocked(stockClient.obtenerTodos).mockResolvedValue([
      {
        id: 'p1',
        codigo: 'PROD-1',
        nombre: 'Producto 1',
        sucursalId: 'suc-1',
        activo: true,
        precioVentaArs: 1000,
        precioVentaUsd: 1,
        iva: 21,
        contextoMonetario: {
          cotizacion_usd_ars: '1000',
          cotizacion_version: 'v1',
          sucursal_id: 'suc-1',
        },
      } as any,
    ]);

    vi.mocked(regionClient.obtenerPorSucursal).mockImplementation(async (sucursalId) => {
      if (sucursalId === 'suc-1') {
        return [
          { id: 'reg-1', nombre: 'CABA', descuento: 5, activo: true } as any,
          { id: 'reg-2', nombre: 'Zona Sur', descuento: 3, activo: true } as any,
        ];
      }
      return [
        { id: 'reg-3', nombre: 'Zona Norte', descuento: 4, activo: true } as any,
      ];
    });

    vi.mocked(descuentoEngineClient.listaSucursal).mockImplementation(async (sucursalId, regionId) => ({
      items: [
        {
          id: 'p1',
          productoId: 'prod-1',
          codigo: 'PROD-1',
          nombre: 'Producto 1',
          subtipoNombre: 'General',
          precioListaArs: 1000,
          precioFinalArs: regionId === 'reg-1' ? 950 : regionId === 'reg-3' ? 960 : 1000,
          precioFinalUsd: 1,
          descuentoTotalPorcentaje: regionId === 'reg-1' ? 5 : regionId === 'reg-3' ? 4 : 0,
          descuentosAportes: regionId === 'reg-1' ? [{ nivel: 'region-cliente', porcentaje: 5 }] : [],
          descuentosDetalle: regionId === 'reg-1' ? ['Región: 5%'] : [],
          noAlcanzaMargen: false,
          precioSinTope: regionId === 'reg-1' ? 950 : 1000,
          precioMinimo: 800,
          costoReposicion: 700,
          margenMinimo: 10,
        } as any,
      ],
      contexto_monetario: {
        cotizacion_usd_ars: '1000',
        cotizacion_version: 'v1',
        sucursal_id: sucursalId,
      } as any,
      sucursal: { id: sucursalId, nombre: sucursalId === 'suc-1' ? 'Sucursal Central' : 'Sucursal Norte' },
      region: regionId === 'reg-1' ? { id: 'reg-1', nombre: 'CABA', descuento: 5 } : regionId === 'reg-3' ? { id: 'reg-3', nombre: 'Zona Norte', descuento: 4 } : null,
    }));
  });

  it('si hay múltiples sucursales, no selecciona ninguna por defecto hasta que el usuario elija', async () => {
    const { result } = renderHook(() => useListaPrecios());

    // Con 2 sucursales, sucursalId queda en blanco
    expect(result.current.sucursalId).toBe('');
    expect(result.current.regionId).toBe('');
    expect(result.current.regionOptions).toEqual([{ value: '', label: 'Sin región' }]);
  });

  it('si hay una única sucursal, aparece esa por defecto', async () => {
    sucursalesMock = [{ id: 'suc-1', nombre: 'Sucursal Central', activo: true }];

    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => {
      expect(result.current.sucursalId).toBe('suc-1');
    });

    await waitFor(() => {
      expect(regionClient.obtenerPorSucursal).toHaveBeenCalledWith('suc-1', true);
      expect(result.current.regionOptions).toEqual([
        { value: '', label: 'Sin región' },
        { value: 'reg-1', label: 'CABA (5%)' },
        { value: 'reg-2', label: 'Zona Sur (3%)' },
      ]);
    });
  });

  it('si la sucursal seleccionada tiene una única región, aparece esa por defecto', async () => {
    // suc-2 solo tiene reg-3 (Zona Norte)
    sucursalesMock = [{ id: 'suc-2', nombre: 'Sucursal Norte', activo: true }];

    const { result } = renderHook(() => useListaPrecios());

    await waitFor(() => {
      expect(result.current.sucursalId).toBe('suc-2');
    });

    await waitFor(() => {
      expect(result.current.regionId).toBe('reg-3');
      expect(result.current.regionNombre).toBe('Zona Norte');
    });

    await waitFor(() => {
      expect(descuentoEngineClient.listaSucursal).toHaveBeenCalledWith('suc-2', 'reg-3');
    });
  });

  it('aplica el descuento de la región cuando se selecciona manualmente', async () => {
    const { result } = renderHook(() => useListaPrecios());

    await act(async () => {
      result.current.onFilterChange('sucursal', 'suc-1');
    });

    await waitFor(() => {
      expect(result.current.sucursalId).toBe('suc-1');
      expect(result.current.regionId).toBe(''); // suc-1 tiene 2 regiones, por defecto Sin región
    });

    await act(async () => {
      result.current.onFilterChange('region', 'reg-1');
    });

    await waitFor(() => {
      expect(result.current.regionId).toBe('reg-1');
      expect(result.current.regionNombre).toBe('CABA');
    });

    await waitFor(() => {
      expect(descuentoEngineClient.listaSucursal).toHaveBeenCalledWith('suc-1', 'reg-1');
    });

    await waitFor(() => {
      const precioItem = result.current.precios.get('p1');
      expect(precioItem?.precioFinalArs).toBe(950);
      expect(precioItem?.descuentoTotalPorcentaje).toBe(5);
    });
  });

  it('al cambiar a una sucursal con una única región, selecciona esa región automáticamente', async () => {
    const { result } = renderHook(() => useListaPrecios());

    await act(async () => {
      result.current.onFilterChange('sucursal', 'suc-1');
      result.current.onFilterChange('region', 'reg-1');
    });

    await waitFor(() => {
      expect(result.current.regionId).toBe('reg-1');
    });

    // Cambiar a sucursal suc-2 (que solo tiene reg-3)
    await act(async () => {
      result.current.onFilterChange('sucursal', 'suc-2');
    });

    await waitFor(() => {
      expect(result.current.sucursalId).toBe('suc-2');
      // Al tener suc-2 una única región, se selecciona reg-3 por defecto
      expect(result.current.regionId).toBe('reg-3');
    });
  });
});
