'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_LIMIT_STEP = 10;
const DEFAULT_DEBOUNCE_MS = 300;

interface UsePaginatedListConfig<T> {
  fetcher: (params: {
    limit: number;
    offset: number;
    search?: string;
  }) => Promise<{ data: T[]; hasMore: boolean }>;
  extraParams?: Record<string, unknown>;
  limitStep?: number;
  debounceMs?: number;
}

interface UsePaginatedListResult<T> {
  items: T[];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Hook genérico para listados paginados con búsqueda y scroll infinito.
 */
export function usePaginatedList<T>({
  fetcher,
  extraParams,
  limitStep = DEFAULT_LIMIT_STEP,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UsePaginatedListConfig<T>): UsePaginatedListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(limitStep);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearchRef = useRef('');

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const extraParamsKey = JSON.stringify(extraParams ?? {});
  const isFirstRenderRef = useRef(true);

  const doFetch = useCallback(
    async (currentLimit: number, currentSearch: string, replace: boolean) => {
      const isInitial = replace;
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const { data, hasMore: more } = await fetcherRef.current({
          limit: currentLimit,
          offset: 0,
          search: currentSearch.trim() || undefined,
        });
        setItems(data);
        setHasMore(more);
      } catch (err) {
        console.error('[usePaginatedList] Error fetching:', err);
      } finally {
        if (isInitial) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void doFetch(limit, debouncedSearchRef.current, false);
  }, [limit, doFetch]);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    setLimit(limitStep);
    void doFetch(limitStep, debouncedSearchRef.current, true);
  }, [extraParamsKey, limitStep, doFetch]);

  const setSearchWithDebounce = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debouncedSearchRef.current = value;
        setLimit(limitStep);
        void doFetch(limitStep, value, true);
      }, debounceMs);
    },
    [debounceMs, limitStep, doFetch]
  );

  const loadMore = useCallback(() => {
    setLimit((prev) => prev + limitStep);
  }, [limitStep]);

  return {
    items,
    search,
    setSearch: setSearchWithDebounce,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
