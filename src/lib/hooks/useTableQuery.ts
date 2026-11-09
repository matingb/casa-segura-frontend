import { useCallback, useEffect, useRef, useState } from 'react';
import { SortCriterion, toggleSortCriterion } from '../../components/ui/Table/Table';
import { getGlobalStaleTimeMs } from '../config/staleTime';

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

export function useTableQuery(initialFilters: Record<string, string> = {}, initialSearch = ''): TableQueryState {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortCriterion[]>([]);
  const [search, setSearch] = useState(initialSearch);
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
  obtenerPaginadoConTotal: (params: any, options?: { signal?: AbortSignal }) => Promise<{ data: T[]; totalPages: number }>;
  obtenerValoresUnicos?: (campo: string, options?: { signal?: AbortSignal }) => Promise<string[]>;
}

export const DEFAULT_CATALOGO_STALE_TIME_MS = getGlobalStaleTimeMs();

export interface CatalogoPaginadoOptions {
  refreshKey?: number | string;
  pageSize?: number;
  searchField?: string;
  initialFilters?: Record<string, string>;
  initialSearch?: string;
  revalidateOnFocus?: boolean;
  staleTimeMs?: number;
  refreshOnEvents?: string[];
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
  const {
    pageSize = 10,
    searchField,
    initialFilters,
    initialSearch,
    refreshKey,
    refreshOnEvents = ['alcance-pdv-revocado'],
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [filtersLoading, setFiltersLoading] = useState(filterFields.length > 0);
  const [eventRevision, setEventRevision] = useState(0);
  const [filtrosRevision, setFiltrosRevision] = useState(0);

  const query = useTableQuery(initialFilters, initialSearch);
  const clientRef = useRef(client);
  clientRef.current = client;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const queryRef = useRef(query);
  queryRef.current = query;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const totalPagesRef = useRef(totalPages);
  totalPagesRef.current = totalPages;

  const filterOptionsRef = useRef(filterOptions);
  filterOptionsRef.current = filterOptions;

  const hasLoadedOnceRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  // Escuchar eventos de dominio para recarga inmediata (por defecto alcance-pdv-revocado)
  const refreshOnEventsKey = refreshOnEvents.join(',');
  useEffect(() => {
    if (!refreshOnEventsKey) return;
    const events = refreshOnEventsKey.split(',').filter(Boolean);
    if (events.length === 0) return;

    const handler = (event: Event) => {
      setEventRevision((n) => n + 1);
      if (event.type === 'alcance-pdv-revocado') {
        setFiltrosRevision((n) => n + 1);
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handler));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
    };
  }, [refreshOnEventsKey]);

  const filterFieldsKey = filterFields.join(',');
  useEffect(() => {
    if (!clientRef.current.obtenerValoresUnicos || filterFields.length === 0) {
      setFiltersLoading(false);
      return;
    }
    let active = true;
    if (Object.keys(filterOptionsRef.current).length === 0) {
      setFiltersLoading(true);
    }

    Promise.all(filterFields.map((campo) => clientRef.current.obtenerValoresUnicos!(campo)))
      .then((results) => {
        if (!active) return;
        const opts: Record<string, { value: string; label: string }[]> = {};
        filterFields.forEach((campo, i) => {
          opts[campo] = (results[i] ?? []).map((v) => ({ value: v, label: v }));
        });
        setFilterOptions(opts);
        filterOptionsRef.current = opts;
      })
      .catch((err) => {
        if (!active) return;
        console.error('[useCatalogoPaginado] Error cargando valores únicos:', err);
      })
      .finally(() => {
        if (active) setFiltersLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFieldsKey, filtrosRevision]);

  // Carga de datos paginados
  useEffect(() => {
    let active = true;
    const abortController = new AbortController();
    inFlightRef.current = true;

    if (!hasLoadedOnceRef.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

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
        if (!active) return;
        lastFetchAtRef.current = Date.now();
        hasLoadedOnceRef.current = true;

        // Corrección de página: si page > totalPages y totalPages > 0, ajustar page
        if (result.totalPages > 0 && query.page > result.totalPages) {
          query.setPage(result.totalPages);
          return;
        }

        setItems(result.data);
        setTotalPages(Math.max(1, result.totalPages));
        setError(null);
      })
      .catch((err) => {
        if (!active || err?.name === 'AbortError') return;
        hasLoadedOnceRef.current = true;
        // Solo vaciar items y resetear totalPages si fue error en carga inicial
        if (itemsRef.current.length === 0) {
          setItems([]);
          setTotalPages(1);
        }
        setError(err instanceof Error ? err.message : 'No se pudo recargar la lista.');
      })
      .finally(() => {
        if (active) {
          inFlightRef.current = false;
          setInitialLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
      inFlightRef.current = false;
      abortController.abort();
    };
  }, [
    query.page,
    query.sort,
    query.filters,
    query.search,
    pageSize,
    searchField,
    refreshKey,
    eventRevision,
  ]);

  // Revalidación silenciosa por foco de ventana o cambio de visibilidad
  const ejecutarRevalidacionSilenciosa = useCallback(async () => {
    const currentOptions = optionsRef.current;
    const revalOnFocus = currentOptions.revalidateOnFocus ?? true;
    const staleTime = currentOptions.staleTimeMs ?? getGlobalStaleTimeMs();

    if (!revalOnFocus) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (Date.now() - lastFetchAtRef.current < staleTime) return;
    if (inFlightRef.current) return;
    if (!hasLoadedOnceRef.current) return;

    const q = queryRef.current;
    const currentSearchField = currentOptions.searchField;
    const currentPageSize = currentOptions.pageSize ?? 10;

    const baseFiltros = {
      ...q.filters,
      ...(currentSearchField && q.search ? { [currentSearchField]: q.search } : {}),
    };

    const baseParams = {
      page: q.page,
      limit: currentPageSize,
      search: currentSearchField ? undefined : (q.search || undefined),
      sort: q.sort,
      filtros: baseFiltros,
    };

    const params = currentOptions.transformParams
      ? currentOptions.transformParams(baseParams)
      : baseParams;

    const paramsSnapshot = JSON.stringify(params);

    inFlightRef.current = true;
    try {
      const result = await clientRef.current.obtenerPaginadoConTotal(params);

      // Verificar si los parámetros cambiaron mientras el request volaba
      const qNow = queryRef.current;
      const nowFiltros = {
        ...qNow.filters,
        ...(currentSearchField && qNow.search ? { [currentSearchField]: qNow.search } : {}),
      };
      const nowBase = {
        page: qNow.page,
        limit: currentPageSize,
        search: currentSearchField ? undefined : (qNow.search || undefined),
        sort: qNow.sort,
        filtros: nowFiltros,
      };
      const nowParams = currentOptions.transformParams
        ? currentOptions.transformParams(nowBase)
        : nowBase;

      if (JSON.stringify(nowParams) !== paramsSnapshot) {
        return;
      }

      lastFetchAtRef.current = Date.now();

      // Corrección de página
      if (result.totalPages > 0 && qNow.page > result.totalPages) {
        qNow.setPage(result.totalPages);
        return;
      }

      const newTotalPages = Math.max(1, result.totalPages);
      const dataChanged = JSON.stringify(result.data) !== JSON.stringify(itemsRef.current);
      const pagesChanged = newTotalPages !== totalPagesRef.current;

      if (dataChanged) {
        setItems(result.data);
      }
      if (pagesChanged) {
        setTotalPages(newTotalPages);
      }
    } catch (err) {
      console.warn('[useCatalogoPaginado] Error en revalidación silenciosa:', err);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      void ejecutarRevalidacionSilenciosa();
    };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [ejecutarRevalidacionSilenciosa]);

  return {
    items,
    initialLoading,
    refreshing,
    loading: initialLoading || refreshing,
    error,
    totalPages,
    ...query,
    filterOptions,
    filtersLoading,
  };
}
