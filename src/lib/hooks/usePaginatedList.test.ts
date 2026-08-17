import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePaginatedList } from './usePaginatedList';

// Fake items para tests
const makeItems = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: String(i + offset) }));

describe('usePaginatedList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carga la primera página al montar', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: makeItems(3), hasMore: false });

    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, limitStep: 3 })
    );

    // Estado inicial tiene 0 items antes de que resuelva el fetcher
    expect(result.current.items).toHaveLength(0);

    // Esperar a que resuelva el fetcher
    await act(async () => { await Promise.resolve(); });

    expect(fetcher).toHaveBeenCalledWith({ limit: 3, offset: 0, search: undefined });
    expect(result.current.items).toHaveLength(3);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('loadMore incrementa el limit y trae más items', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ data: makeItems(2), hasMore: true })
      .mockResolvedValueOnce({ data: makeItems(4), hasMore: false });

    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, limitStep: 2 })
    );

    await act(async () => { await Promise.resolve(); });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(true);

    // Llama loadMore
    await act(async () => {
      result.current.loadMore();
      await Promise.resolve();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith({ limit: 4, offset: 0, search: undefined });
    expect(result.current.items).toHaveLength(4);
    expect(result.current.hasMore).toBe(false);
  });

  it('setSearch con debounce resetea el limit y aplica búsqueda', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ data: makeItems(3), hasMore: false })
      .mockResolvedValueOnce({ data: makeItems(1), hasMore: false });

    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, limitStep: 3, debounceMs: 300 })
    );

    await act(async () => { await Promise.resolve(); });
    expect(result.current.items).toHaveLength(3);

    // Escribir en el buscador
    act(() => {
      result.current.setSearch('camara');
    });

    // El debounce aún no disparó
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Avanzar el debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith({ limit: 3, offset: 0, search: 'camara' });
    expect(result.current.items).toHaveLength(1);
  });

  it('expone loadingMore=true mientras carga la siguiente página', async () => {
    let resolveSecond!: (v: any) => void;
    const secondPromise = new Promise((res) => { resolveSecond = res; });

    const fetcher = vi.fn()
      .mockResolvedValueOnce({ data: makeItems(2), hasMore: true })
      .mockReturnValueOnce(secondPromise);

    const { result } = renderHook(() =>
      usePaginatedList({ fetcher, limitStep: 2 })
    );

    await act(async () => { await Promise.resolve(); });
    expect(result.current.loadingMore).toBe(false);

    act(() => { result.current.loadMore(); });
    // loadingMore debería estar en true
    expect(result.current.loadingMore).toBe(true);

    // Resolver la segunda promesa
    await act(async () => {
      resolveSecond({ data: makeItems(4), hasMore: false });
      await Promise.resolve();
    });

    expect(result.current.loadingMore).toBe(false);
    expect(result.current.items).toHaveLength(4);
  });
});
