'use client';

import { useEffect, useMemo, useState } from 'react';
import { CuentaFinanciera } from '../../../../lib/types/CuentaFinanciera';
import { cuentaFinancieraClient } from '../../../../lib/api/cuenta-financiera.client';
import { useTableQuery } from '../../../../lib/hooks/useTableQuery';
import type { SortCriterion } from '../../../../components/ui/Table/Table';

interface UseCuentasFinancierasResult {
  cuentas: CuentaFinanciera[];
  isLoading: boolean;
  totalSaldoActual: number;
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortCriterion[];
  onSortChange: (columnKey: string) => void;
  filters: Record<string, string>;
  onFilterChange: (columnKey: string, value: string) => void;
}

export function useCuentasFinancieras(): UseCuentasFinancierasResult {
  const [cuentas, setCuentas] = useState<CuentaFinanciera[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { sort, onSortChange, search, onSearchChange, filters, onFilterChange } = useTableQuery();

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void cuentaFinancieraClient
      .obtenerTodasFiltradas({
        sort,
        filtros: {
          ...filters,
          ...(search ? { nombre: search } : {}),
        },
      })
      .then((result) => {
        if (active) setCuentas(result);
      })
      .catch((err) => console.error('[useCuentasFinancieras] Error cargando cuentas:', err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sort, filters, search]);

  const totalSaldoActual = useMemo(
    () => cuentas.reduce((sum, c) => sum + c.saldoActual, 0),
    [cuentas]
  );

  return {
    cuentas,
    isLoading,
    totalSaldoActual,
    search,
    onSearchChange,
    sort,
    onSortChange,
    filters,
    onFilterChange,
  };
}
