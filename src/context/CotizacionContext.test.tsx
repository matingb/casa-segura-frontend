import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CotizacionProvider, useCotizacion } from './CotizacionContext';
import { cotizacionClient } from '../lib/api/cotizacion.client';
import { Cotizacion } from '../lib/types/Moneda';

vi.mock('../lib/api/cotizacion.client', () => ({
  cotizacionClient: {
    obtener: vi.fn(),
    actualizar: vi.fn(),
  },
}));

describe('CotizacionContext', () => {
  const mockCotizacion1: Cotizacion = {
    cotizacion_usd_ars: '1000.00',
    cotizacion_version: 'v1',
    actualizada_at: '2026-01-01T10:00:00Z',
    origen: 'TENANT',
    puede_actualizar: true,
    sugerencias_sucursales: [],
  };

  const mockCotizacion2: Cotizacion = {
    ...mockCotizacion1,
    cotizacion_usd_ars: '1050.00',
    cotizacion_version: 'v2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <CotizacionProvider>{children}</CotizacionProvider>
  );

  it('no incrementa revision en la carga inicial (mantiene revision = 0)', async () => {
    vi.mocked(cotizacionClient.obtener).mockResolvedValueOnce(mockCotizacion1);

    const { result } = renderHook(() => useCotizacion(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.datos).toEqual(mockCotizacion1);
    expect(result.current.revision).toBe(0);
    expect(cotizacionClient.obtener).toHaveBeenCalledTimes(1);
  });

  it('no incrementa revision si la cotización consultada en focus tiene el mismo valor', async () => {
    vi.mocked(cotizacionClient.obtener).mockResolvedValue(mockCotizacion1);

    const { result } = renderHook(() => useCotizacion(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.revision).toBe(0);

    act(() => {
      vi.advanceTimersByTime(305_000);
      window.dispatchEvent(new Event('focus'));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(cotizacionClient.obtener).toHaveBeenCalledTimes(2);
    // Como mockCotizacion1 tiene los mismos valores, revision no debe cambiar
    expect(result.current.revision).toBe(0);
  });

  it('ignora el foco si transcurrieron menos de 5 minutos (staleTime)', async () => {
    vi.mocked(cotizacionClient.obtener).mockResolvedValue(mockCotizacion1);

    const { result } = renderHook(() => useCotizacion(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(cotizacionClient.obtener).toHaveBeenCalledTimes(1);

    // Avanzar 2 minutos (menor a los 5 minutos) y disparar focus
    act(() => {
      vi.advanceTimersByTime(120_000);
      window.dispatchEvent(new Event('focus'));
    });

    await act(async () => {
      await Promise.resolve();
    });

    // No debe haber llamado de nuevo a obtener
    expect(cotizacionClient.obtener).toHaveBeenCalledTimes(1);
    expect(result.current.revision).toBe(0);
  });

  it('incrementa revision en 1 cuando el valor de cotización realmente cambia', async () => {
    vi.mocked(cotizacionClient.obtener)
      .mockResolvedValueOnce(mockCotizacion1)
      .mockResolvedValueOnce(mockCotizacion2);

    const { result } = renderHook(() => useCotizacion(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.revision).toBe(0);

    // Avanzar más de 5 minutos y disparar foco
    act(() => {
      vi.advanceTimersByTime(305_000);
      window.dispatchEvent(new Event('focus'));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(cotizacionClient.obtener).toHaveBeenCalledTimes(2);
    expect(result.current.datos).toEqual(mockCotizacion2);
    expect(result.current.revision).toBe(1);
  });

  it('el evento cotizacion-actualizada revalida de inmediato sin esperar staleTime', async () => {
    vi.mocked(cotizacionClient.obtener)
      .mockResolvedValueOnce(mockCotizacion1)
      .mockResolvedValueOnce(mockCotizacion2);

    const { result } = renderHook(() => useCotizacion(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(cotizacionClient.obtener).toHaveBeenCalledTimes(1);

    // Disparar evento apenas 5 segundos después
    act(() => {
      vi.advanceTimersByTime(5_000);
      window.dispatchEvent(new CustomEvent('cotizacion-actualizada', { detail: { alcance: 'TENANT' } }));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(cotizacionClient.obtener).toHaveBeenCalledTimes(2);
    expect(result.current.revision).toBe(1);
  });
});

