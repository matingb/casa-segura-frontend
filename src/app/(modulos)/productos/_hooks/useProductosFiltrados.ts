'use client';

import { useCallback, useEffect, useState } from 'react';
import { productoClient } from '../../../../lib/api/producto.client';
import { Producto } from '../../../../lib/types/Producto';
import type { SortCriterion } from '../../../../components/ui/Table/Table';

const PAGE_SIZE = 10;

const SELECT_FILTER_FIELDS = ['marca', 'modelo', 'subtipo', 'estado'] as const;

export function useProductosFiltrados() {
  const [items, setItems] = useState<Producto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [sort, setSort] = useState<SortCriterion[]>([]);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [filterOptions, setFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [filtersLoading, setFiltersLoading] = useState(true);

  const fetchPage = useCallback(
    async (currentPage: number, currentSort: SortCriterion[], currentFilters: Record<string, string>) => {
      setLoading(true);
      try {
        const result = await productoClient.obtenerPaginadoConTotal({
          page: currentPage,
          limit: PAGE_SIZE,
          sort: currentSort,
          filtros: currentFilters,
        });
        setItems(result.data);
        setTotalPages(result.totalPages);
      } catch (err) {
        console.error('[useProductosFiltrados] Error fetching:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchPage(page, sort, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, filters]);

  useEffect(() => {
    setFiltersLoading(true);
    Promise.all(SELECT_FILTER_FIELDS.map((campo) => productoClient.obtenerValoresUnicos(campo)))
      .then((results) => {
        const options: Record<string, { value: string; label: string }[]> = {};
        SELECT_FILTER_FIELDS.forEach((campo, i) => {
          options[campo] = results[i].map((v) => ({ value: v, label: v }));
        });
        setFilterOptions(options);
      })
      .catch((err) => console.error('[useProductosFiltrados] Error cargando valores únicos:', err))
      .finally(() => setFiltersLoading(false));
  }, []);

  const handleSortChange = useCallback((columnKey: string) => {
    setSort((prev) => {
      const idx = prev.findIndex((c) => c.sortBy === columnKey);

      if (idx === -1) return [...prev, { sortBy: columnKey, sortDir: 'asc' }];
      if (prev[idx].sortDir === 'asc') {
        const next = [...prev];
        next[idx] = { sortBy: columnKey, sortDir: 'desc' };
        return next;
      }
      return prev.filter((c) => c.sortBy !== columnKey);
    });
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((columnKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnKey]: value }));
    setPage(1);
  }, []);

  return {
    items,
    page,
    totalPages,
    setPage,
    loading,
    sort,
    onSortChange: handleSortChange,
    filters,
    onFilterChange: handleFilterChange,
    filterOptions,
    filtersLoading,
  };
}
