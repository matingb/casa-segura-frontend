'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CuentaFinanciera } from '../../../../lib/types/CuentaFinanciera';
import { cuentaFinancieraClient } from '../../../../lib/api/cuenta-financiera.client';
import type { SortCriterion } from '../../../../components/ui/Table/Table';

interface UseCuentasFinancierasResult {
  cuentas: CuentaFinanciera[];
  isLoading: boolean;
  totalSaldoActual: number;
  sort: SortCriterion[];
  onSortChange: (columnKey: string) => void;
  filters: Record<string, string>;
  onFilterChange: (columnKey: string, value: string) => void;
}

export function useCuentasFinancieras(): UseCuentasFinancierasResult {
  const [cuentas, setCuentas] = useState<CuentaFinanciera[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [sort, setSort] = useState<SortCriterion[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchCuentas = useCallback(
    async (currentSort: SortCriterion[], currentFilters: Record<string, string>) => {
      setIsLoading(true);
      try {
        const result = await cuentaFinancieraClient.obtenerTodasFiltradas({
          sort: currentSort,
          filtros: currentFilters,
        });
        setCuentas(result);
      } catch (err) {
        console.error('[useCuentasFinancieras] Error cargando cuentas:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchCuentas(sort, filters);
  }, [sort, filters, fetchCuentas]);

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
  }, []);

  const handleFilterChange = useCallback((columnKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnKey]: value }));
  }, []);

  const totalSaldoActual = useMemo(
    () => cuentas.reduce((sum, c) => sum + c.saldoActual, 0),
    [cuentas]
  );

  return {
    cuentas,
    isLoading,
    totalSaldoActual,
    sort,
    onSortChange: handleSortChange,
    filters,
    onFilterChange: handleFilterChange,
  };
}
