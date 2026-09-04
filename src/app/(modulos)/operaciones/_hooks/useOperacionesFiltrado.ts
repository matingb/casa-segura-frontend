'use client';

import { useEffect, useMemo, useState } from 'react';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { tipoOperacionClient } from '../../../../lib/api/tipo-operacion.client';
import { useCatalogoPaginado } from '../../../../lib/hooks/useTableQuery';

export interface TipoOption {
  value: string;
  label: string;
}

const SELECT_FILTER_FIELDS = ['sucursal'] as const;

export function useOperacionesFiltrado() {
  const [tiposOperacion, setTiposOperacion] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    tipoOperacionClient.obtenerTodos().then(setTiposOperacion).catch(console.error);
  }, []);

  const table = useCatalogoPaginado(operacionesClient, SELECT_FILTER_FIELDS, {
    transformParams: ({ page, limit, sort, filtros, search }) => {
      const { tipo, ...rest } = filtros;
      return {
        page,
        limit,
        tipoId: tipo || undefined,
        sort,
        filtros: { ...rest, ...(search ? { usuario: search } : {}) },
      };
    },
  });

  const tipoOptions: TipoOption[] = useMemo(
    () => tiposOperacion.map((t) => ({ value: t.id, label: t.nombre })),
    [tiposOperacion]
  );
  const totalMonto = useMemo(() => table.items.reduce((acc, op) => acc + op.monto, 0), [table.items]);

  return {
    ...table,
    operaciones: table.items,
    tipoOptions,
    totalMonto,
  };
}
