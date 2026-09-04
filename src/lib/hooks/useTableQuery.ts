import { useCallback, useEffect, useRef, useState } from 'react';
import { SortCriterion, toggleSortCriterion } from '../../components/ui/Table/Table';

export { toggleSortCriterion };
export type { SortCriterion };

export interface TableQueryState {
  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  sort: SortCriterion[];
  setSort: (sort: SortCriterion[] | ((prev: SortCriterion[]) => SortCriterion[])) => void;
  onSortChange: (columnKey: string) => void;
  search: string;
  setSearch: (search: string | ((prev: string) => string)) => void;
  onSearchChange: (value: string) => void;
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  onFilterChange: (columnKey: string, value: string) => void;
  resetQuery: (newFilters?: Record<string, string>) => void;
}

export function useTableQuery(initialFilters: Record<string, string> = {}): TableQueryState {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortCriterion[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

  const onSortChange = useCallback((columnKey: string) => {
    setSort((prev) => toggleSortCriterion(prev, columnKey));
    setPage(1);
  }, []);

  const onFilterChange = useCallback((columnKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnKey]: value }));
    setPage(1);
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const resetQuery = useCallback((newFilters: Record<string, string> = {}) => {
    setPage(1);
    setSort([]);
    setSearch('');
    setFilters(newFilters);
  }, []);

  return {
    page,
    setPage,
    sort,
    setSort,
    onSortChange,
    search,
    setSearch,
    onSearchChange,
    filters,
    setFilters,
    onFilterChange,
    resetQuery,
  };
}

export interface CatalogoClient<T> {
  obtenerPaginadoConTotal: (params: any) => Promise<{ data: T[]; totalPages: number }>;
  obtenerValoresUnicos?: (campo: string) => Promise<string[]>;
}

export interface CatalogoPaginadoOptions {
  pageSize?: number;
  searchField?: string;
  initialFilters?: Record<string, string>;
  transformParams?: (params: {
    page: number;
    limit: number;
    search?: string;
    sort: SortCriterion[];
    filtros: Record<string, string>;
  }) => any;
}

export function useCatalogoPaginado<T>(
  client: CatalogoClient<T>,
  filterFields: readonly string[] = [],
  options: CatalogoPaginadoOptions = {}
) {
  const { pageSize = 10, searchField, initialFilters, transformParams } = options;
  const [items, setItems] = useState<T[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [filtersLoading, setFiltersLoading] = useState(filterFields.length > 0);

  const query = useTableQuery(initialFilters);
  const clientRef = useRef(client);
  clientRef.current = client;

  // Carga concurrente de opciones de filtros únicos
  useEffect(() => {
    if (!clientRef.current.obtenerValoresUnicos || filterFields.length === 0) {
      setFiltersLoading(false);
      return;
    }
    let active = true;
    setFiltersLoading(true);

    Promise.all(filterFields.map((campo) => clientRef.current.obtenerValoresUnicos!(campo)))
      .then((results) => {
        if (!active) return;
        const opts: Record<string, { value: string; label: string }[]> = {};
        filterFields.forEach((campo, i) => {
          opts[campo] = (results[i] ?? []).map((v) => ({ value: v, label: v }));
        });
        setFilterOptions(opts);
      })
      .catch((err) => console.error('[useCatalogoPaginado] Error cargando valores únicos:', err))
      .finally(() => {
        if (active) setFiltersLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFields.join(',')]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Carga de datos paginados
  useEffect(() => {
    let active = true;
    setLoading(true);

    const baseFiltros = {
      ...query.filters,
      ...(searchField && query.search ? { [searchField]: query.search } : {}),
    };

    const baseParams = {
      page: query.page,
      limit: pageSize,
      search: searchField ? undefined : (query.search || undefined),
      sort: query.sort,
      filtros: baseFiltros,
    };

    const params = optionsRef.current.transformParams
      ? optionsRef.current.transformParams(baseParams)
      : baseParams;

    void clientRef.current
      .obtenerPaginadoConTotal(params)
      .then((result) => {
        if (active) {
          setItems(result.data);
          setTotalPages(result.totalPages);
        }
      })
      .catch((err) => console.error('[useCatalogoPaginado] Error fetching:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query.page, query.sort, query.filters, query.search, pageSize, searchField]);

  return {
    items,
    loading,
    totalPages,
    ...query,
    filterOptions,
    filtersLoading,
  };
}
