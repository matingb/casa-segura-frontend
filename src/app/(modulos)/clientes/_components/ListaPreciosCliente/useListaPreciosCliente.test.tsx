import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListaPreciosCliente } from '../../../../../lib/types/ListaPreciosCliente';
import { useListaPreciosCliente } from './useListaPreciosCliente';

const mocks = vi.hoisted(() => ({
  listaCliente: vi.fn(),
}));

vi.mock('../../../../../lib/api/descuento-engine.client', () => ({
  descuentoEngineClient: { listaCliente: mocks.listaCliente },
}));

vi.mock('../../../../../lib/hooks/useCotizacionSucursal', () => ({
  useCotizacionSucursal: () => ({ revision: 1, cargando: false }),
}));

function lista(clienteId: string, sucursalId: string): ListaPreciosCliente {
  return {
    items: [],
    contexto_monetario: { cotizacion_usd_ars: null, cotizacion_version: 'v1', actualizada_at: null, origen: 'TENANT', sucursal_id: null },
    sucursal: { id: sucursalId, nombre: sucursalId },
    cliente: { id: clienteId, nombre: clienteId, descuento_porcentaje: 0, regionNombre: null, regionDescuento: null },
  };
}

describe('useListaPreciosCliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listaCliente.mockImplementation(async (sucursalId: string, clienteId: string) => lista(clienteId, sucursalId));
  });

  it('no vuelve a consultar por arrays equivalentes ni por controles locales', async () => {
    const { result, rerender } = renderHook(
      ({ sucursales }) => useListaPreciosCliente({ clienteId: 'c1', sucursales }),
      { initialProps: { sucursales: [{ id: 's1', nombre: 'Centro' }] } },
    );
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(1));

    rerender({ sucursales: [{ id: 's1', nombre: 'Centro actualizado' }] });
    act(() => {
      result.current.setBusqueda('producto');
      result.current.setSoloPendientes(true);
    });

    await waitFor(() => expect(result.current.busqueda).toBe('producto'));
    expect(mocks.listaCliente).toHaveBeenCalledTimes(1);
  });

  it('invalida y carga al cambiar de cliente o PDV', async () => {
    const sucursales = [{ id: 's1', nombre: 'Centro' }, { id: 's2', nombre: 'Norte' }];
    const { result, rerender } = renderHook(
      ({ clienteId }) => useListaPreciosCliente({ clienteId, sucursales }),
      { initialProps: { clienteId: 'c1' } },
    );
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(1));
    expect(mocks.listaCliente).toHaveBeenLastCalledWith('s1', 'c1');

    act(() => result.current.setSucursalId('s2'));
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(2));
    expect(mocks.listaCliente).toHaveBeenLastCalledWith('s2', 'c1');

    rerender({ clienteId: 'c2' });
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(3));
    expect(mocks.listaCliente).toHaveBeenLastCalledWith('s2', 'c2');
  });
});
