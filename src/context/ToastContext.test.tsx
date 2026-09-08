import { act, renderHook, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('ToastContext', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra notificaciones de éxito y error', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showSuccess('Producto creado correctamente.');
      result.current.showError('No se pudo guardar el producto.');
    });

    expect(screen.getByText('Producto creado correctamente.')).toBeInTheDocument();
    expect(screen.getByText('No se pudo guardar el producto.')).toBeInTheDocument();
  });

  it('elimina automáticamente una notificación al vencer su duración', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showSuccess('Guardado.', { duration: 100 });
    });
    expect(screen.getByText('Guardado.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByText('Guardado.')).not.toBeInTheDocument();
  });

  it('permite cerrar una notificación manualmente', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.showError('La operación no pudo registrarse.');
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: 'Cerrar notificación' }).click();
    });
    expect(screen.queryByText('La operación no pudo registrarse.')).not.toBeInTheDocument();
  });
});
