import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useTableQuery, toggleSortCriterion } from './useTableQuery';

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
