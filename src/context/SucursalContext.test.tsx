import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SucursalProvider, useSucursales } from './SucursalContext';
import { sucursalClient } from '../lib/api/sucursal.client';

vi.mock('../lib/api/sucursal.client', () => ({
  sucursalClient: {
    obtenerTodas: vi.fn(),
  },
}));

describe('SucursalContext / SucursalProvider', () => {
  const mockSucursales = [
    {
      id: 's1',
      nombre: 'Casa Central',
      esCentral: true,
      valorDolar: 1200,
      usuarioSucursalId: 'us-1',
      rolId: 'rol-1',
      rolNombre: 'Administrador',
    },
    {
      id: 's2',
      nombre: 'Sucursal Norte',
      esCentral: false,
      valorDolar: 1200,
      usuarioSucursalId: 'us-2',
      rolId: 'rol-2',
      rolNombre: 'Vendedor',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SucursalProvider>{children}</SucursalProvider>
  );

  it('lanza un error si useSucursales se utiliza fuera de SucursalProvider', () => {
    // Suppress console.error during this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSucursales())).toThrow(
      'useSucursales debe ser utilizado dentro de un SucursalProvider'
    );
    consoleError.mockRestore();
  });

  it('carga las sucursales en el montaje y genera sucursalOptions correctamente', async () => {
    vi.mocked(sucursalClient.obtenerTodas).mockResolvedValueOnce(mockSucursales);

    const { result } = renderHook(() => useSucursales(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sucursales).toEqual(mockSucursales);
    expect(result.current.sucursalOptions).toEqual([
      { value: '', label: 'Todas las sucursales' },
      { value: 's1', label: 'Casa Central' },
      { value: 's2', label: 'Sucursal Norte' },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('permite recargar sucursales mediante recargarSucursales', async () => {
    vi.mocked(sucursalClient.obtenerTodas)
      .mockResolvedValueOnce([mockSucursales[0]])
      .mockResolvedValueOnce(mockSucursales);

    const { result } = renderHook(() => useSucursales(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.sucursales).toHaveLength(1);

    await act(async () => {
      await result.current.recargarSucursales();
    });

    expect(result.current.sucursales).toHaveLength(2);
  });

  it('captura errores si la llamada a la API falla', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(sucursalClient.obtenerTodas).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSucursales(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.sucursales).toEqual([]);
    consoleError.mockRestore();
  });
});
