import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTableQuery, toggleSortCriterion, useCatalogoPaginado } from './useTableQuery';

describe('toggleSortCriterion', () => {
  it('agrega una columna en asc si no estaba ordenada', () => {
    const result = toggleSortCriterion([], 'nombre');
    expect(result).toEqual([{ sortBy: 'nombre', sortDir: 'asc' }]);
  });

  it('cambia una columna de asc a desc si ya estaba ordenada asc', () => {
    const prev = [{ sortBy: 'nombre', sortDir: 'asc' as const }];
    const result = toggleSortCriterion(prev, 'nombre');
    expect(result).toEqual([{ sortBy: 'nombre', sortDir: 'desc' }]);
  });

  it('quita el orden si ya estaba en desc (ciclo de 3 estados)', () => {
    const prev = [{ sortBy: 'nombre', sortDir: 'desc' as const }];
    const result = toggleSortCriterion(prev, 'nombre');
    expect(result).toEqual([]);
  });

  it('mantiene otras columnas ordenadas al alternar una columna (multi-column sort)', () => {
    const prev = [{ sortBy: 'marca', sortDir: 'asc' as const }];
    const result = toggleSortCriterion(prev, 'nombre');
    expect(result).toEqual([
      { sortBy: 'marca', sortDir: 'asc' },
      { sortBy: 'nombre', sortDir: 'asc' },
    ]);
  });
});

describe('useTableQuery', () => {
  it('inicializa con valores por defecto', () => {
    const { result } = renderHook(() => useTableQuery());

    expect(result.current.page).toBe(1);
    expect(result.current.sort).toEqual([]);
    expect(result.current.search).toBe('');
    expect(result.current.filters).toEqual({});
  });

  it('acepta initialFilters', () => {
    const { result } = renderHook(() => useTableQuery({ sucursal: 's-1' }));

    expect(result.current.filters).toEqual({ sucursal: 's-1' });
  });

  it('actualiza search y reinicia page a 1', () => {
    const { result } = renderHook(() => useTableQuery());

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.onSearchChange('taladro');
    });

    expect(result.current.search).toBe('taladro');
    expect(result.current.page).toBe(1);
  });

  it('actualiza filtros y reinicia page a 1', () => {
    const { result } = renderHook(() => useTableQuery());

    act(() => {
      result.current.setPage(2);
    });

    act(() => {
      result.current.onFilterChange('marca', 'Bosch');
    });

    expect(result.current.filters).toEqual({ marca: 'Bosch' });
    expect(result.current.page).toBe(1);
  });

  it('actualiza sort ciclando y reinicia page a 1', () => {
    const { result } = renderHook(() => useTableQuery());

    act(() => {
      result.current.setPage(4);
    });

    act(() => {
      result.current.onSortChange('precio');
    });

    expect(result.current.sort).toEqual([{ sortBy: 'precio', sortDir: 'asc' }]);
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.onSortChange('precio');
    });
    expect(result.current.sort).toEqual([{ sortBy: 'precio', sortDir: 'desc' }]);

    act(() => {
      result.current.onSortChange('precio');
    });
    expect(result.current.sort).toEqual([]);
  });

  it('permite reiniciar la query con resetQuery', () => {
    const { result } = renderHook(() => useTableQuery({ marca: 'DeWalt' }));

    act(() => {
      result.current.setPage(5);
      result.current.onSearchChange('taladro');
      result.current.onSortChange('nombre');
    });

    act(() => {
      result.current.resetQuery({ sucursal: 's-2' });
    });

    expect(result.current.page).toBe(1);
    expect(result.current.search).toBe('');
    expect(result.current.sort).toEqual([]);
    expect(result.current.filters).toEqual({ sucursal: 's-2' });
  });
});

describe('useCatalogoPaginado', () => {
  const mockClient = {
    obtenerPaginadoConTotal: vi.fn(),
    obtenerValoresUnicos: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('en la primera carga maneja initialLoading correctamente y realiza una sola llamada', async () => {
    mockClient.obtenerPaginadoConTotal.mockResolvedValueOnce({
      data: [{ id: 1, name: 'Item 1' }],
      totalPages: 1,
    });

    const { result } = renderHook(() =>
      useCatalogoPaginado(mockClient, [])
    );

    expect(result.current.initialLoading).toBe(true);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.initialLoading).toBe(false);
    expect(result.current.refreshing).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([{ id: 1, name: 'Item 1' }]);
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);
  });

  it('al cambiar de página conserva items y totalPages visibles con refreshing=true (stale-while-revalidate)', async () => {
    let resolverPagina2: (res: any) => void;
    const promesaPagina2 = new Promise((resolve) => {
      resolverPagina2 = resolve;
    });

    mockClient.obtenerPaginadoConTotal
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Item 1' }],
        totalPages: 3,
      })
      .mockImplementationOnce(() => promesaPagina2);

    const { result } = renderHook(() =>
      useCatalogoPaginado(mockClient, [])
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.items).toEqual([{ id: 1, name: 'Item 1' }]);
    expect(result.current.totalPages).toBe(3);

    // Navegar a página 2
    act(() => {
      result.current.setPage(2);
    });

    // Durante la carga de la página 2:
    expect(result.current.refreshing).toBe(true);
    expect(result.current.initialLoading).toBe(false);
    // Los items y totalPages previos NO se vacían
    expect(result.current.items).toEqual([{ id: 1, name: 'Item 1' }]);
    expect(result.current.totalPages).toBe(3);

    // Resolver página 2
    await act(async () => {
      resolverPagina2!({
        data: [{ id: 2, name: 'Item 2' }],
        totalPages: 3,
      });
      await Promise.resolve();
    });

    expect(result.current.refreshing).toBe(false);
    expect(result.current.items).toEqual([{ id: 2, name: 'Item 2' }]);
  });

  it('un error en refresco conserva los datos previos y muestra el error', async () => {
    mockClient.obtenerPaginadoConTotal
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Item 1' }],
        totalPages: 2,
      })
      .mockRejectedValueOnce(new Error('Fallo de conexión'));

    const { result } = renderHook(() =>
      useCatalogoPaginado(mockClient, [])
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.items).toEqual([{ id: 1, name: 'Item 1' }]);

    // Cambiar a página 2 y fallar
    await act(async () => {
      result.current.setPage(2);
      await Promise.resolve();
    });

    // Items y totalPages se preservan para que la UI no colapse
    expect(result.current.items).toEqual([{ id: 1, name: 'Item 1' }]);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.error).toBe('Fallo de conexión');
    expect(result.current.refreshing).toBe(false);
  });

  it('ajusta la página automáticamente si result.totalPages < query.page', async () => {
    mockClient.obtenerPaginadoConTotal
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Item 1' }],
        totalPages: 5,
      })
      .mockResolvedValueOnce({
        data: [{ id: 1, name: 'Item 1' }],
        totalPages: 2, // Total pages disminuyó
      })
      .mockResolvedValueOnce({
        data: [{ id: 2, name: 'Item 2 en página 2' }],
        totalPages: 2,
      });

    const { result } = renderHook(() =>
      useCatalogoPaginado(mockClient, [])
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Usuario navega a página 4
    await act(async () => {
      result.current.setPage(4);
      await Promise.resolve();
    });

    // Como el total devuelto fue 2, se corrige automáticamente la página a 2
    expect(result.current.page).toBe(2);
  });

  it('revalidación silenciosa por foco no dispara antes de staleTime y sí después', async () => {
    vi.useFakeTimers();
    mockClient.obtenerPaginadoConTotal.mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
      totalPages: 1,
    });

    const { result } = renderHook(() =>
      useCatalogoPaginado(mockClient, [], { staleTimeMs: 60_000 })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);

    // Foco a los 20s (menor a staleTime): no dispara
    act(() => {
      vi.advanceTimersByTime(20_000);
      window.dispatchEvent(new Event('focus'));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);

    // Foco a los 70s (mayor a staleTime): dispara revalidación silenciosa
    act(() => {
      vi.advanceTimersByTime(50_000);
      window.dispatchEvent(new Event('focus'));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(2);
    // La revalidación silenciosa no altera loading ni refreshing
    expect(result.current.refreshing).toBe(false);
    expect(result.current.loading).toBe(false);

    vi.useRealTimers();
  });

  it('usa por defecto 5 minutos (300 000 ms) de staleTime si no se especifica', async () => {
    vi.useFakeTimers();
    mockClient.obtenerPaginadoConTotal.mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
      totalPages: 1,
    });

    renderHook(() => useCatalogoPaginado(mockClient, []));

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);

    // Foco a los 4 minutos (240s): no dispara
    act(() => {
      vi.advanceTimersByTime(240_000);
      window.dispatchEvent(new Event('focus'));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);

    // Foco pasados los 5 minutos (total 310s): dispara revalidación
    act(() => {
      vi.advanceTimersByTime(70_000);
      window.dispatchEvent(new Event('focus'));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('no ejecuta revalidación si el documento está oculto', async () => {
    vi.useFakeTimers();
    mockClient.obtenerPaginadoConTotal.mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
      totalPages: 1,
    });

    const { result } = renderHook(() =>
      useCatalogoPaginado(mockClient, [], { staleTimeMs: 60_000 })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);

    // Simular pestaña oculta
    const originalVisibilityState = document.visibilityState;
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    act(() => {
      vi.advanceTimersByTime(70_000);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      value: originalVisibilityState,
      configurable: true,
    });
    vi.useRealTimers();
  });

  it('el cambio de refreshKey no vuelve a pedir valores únicos', async () => {
    mockClient.obtenerPaginadoConTotal.mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
      totalPages: 1,
    });
    mockClient.obtenerValoresUnicos.mockResolvedValue(['Opción A', 'Opción B']);

    const { rerender } = renderHook(
      ({ refreshKey }) =>
        useCatalogoPaginado(mockClient, ['campo1'], { refreshKey }),
      { initialProps: { refreshKey: 0 } }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockClient.obtenerValoresUnicos).toHaveBeenCalledTimes(1);
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);

    // Cambiar refreshKey (ej. cotización)
    rerender({ refreshKey: 1 });

    await act(async () => {
      await Promise.resolve();
    });

    // Se recargó la tabla pero NO los valores únicos
    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(2);
    expect(mockClient.obtenerValoresUnicos).toHaveBeenCalledTimes(1);
  });

  it('el evento alcance-pdv-revocado recarga datos y valores únicos', async () => {
    mockClient.obtenerPaginadoConTotal.mockResolvedValue({
      data: [{ id: 1, name: 'Item 1' }],
      totalPages: 1,
    });
    mockClient.obtenerValoresUnicos.mockResolvedValue(['Sucursal 1']);

    renderHook(() => useCatalogoPaginado(mockClient, ['sucursal']));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(1);
    expect(mockClient.obtenerValoresUnicos).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new CustomEvent('alcance-pdv-revocado'));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockClient.obtenerPaginadoConTotal).toHaveBeenCalledTimes(2);
    expect(mockClient.obtenerValoresUnicos).toHaveBeenCalledTimes(2);
  });
});
