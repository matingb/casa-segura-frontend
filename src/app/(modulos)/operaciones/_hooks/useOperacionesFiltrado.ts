'use client';

import { useEffect, useMemo, useState } from 'react';
import { Operacion } from '../../../../lib/types/Operacion';
import { operacionesClient } from '../../../../lib/api/operaciones.client';

export interface FiltrosOperacion {
  busqueda: string;
  sucursalId: string;
  tipoId: string;
}

export interface SucursalOption {
  value: string;
  label: string;
}

export interface TipoOption {
  value: string;
  label: string;
}

interface UseOperacionesFiltradoResult {
  operaciones: Operacion[];
  isLoading: boolean;
  busqueda: string;
  setBusqueda: (v: string) => void;
  sucursalId: string;
  setSucursalId: (v: string) => void;
  tipoId: string;
  setTipoId: (v: string) => void;
  sucursalOptions: SucursalOption[];
  tipoOptions: TipoOption[];
  totalMonto: number;
}

function coincideConBusqueda(op: Operacion, q: string): boolean {
  return [op.tipoNombre, op.usuarioNombre, op.sucursalNombre, op.descripcion]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

export function useOperacionesFiltrado(): UseOperacionesFiltradoResult {
  const [busqueda, setBusqueda] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [operacionesTotal, setOperacionesTotal] = useState<Operacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    operacionesClient
      .obtenerTodas()
      .then(setOperacionesTotal)
      .catch((err) => {
        console.error('[useOperacionesFiltrado] Error loading operaciones:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sucursalOptions: SucursalOption[] = useMemo(() => {
    const unique = new Map<string, string>();
    operacionesTotal.forEach((op) => {
      if (op.sucursalNombre && !unique.has(op.sucursalNombre)) {
        unique.set(op.sucursalNombre, op.sucursalNombre);
      }
    });
    return [
      { value: '', label: 'Todas las sucursales' },
      ...Array.from(unique.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [operacionesTotal]);

  const tipoOptions: TipoOption[] = useMemo(() => {
    const unique = new Map<string, string>();
    operacionesTotal.forEach((op) => {
      if (op.tipoId && !unique.has(op.tipoId)) {
        unique.set(op.tipoId, op.tipoNombre || op.tipoId);
      }
    });
    return [
      { value: '', label: 'Todos los tipos' },
      ...Array.from(unique.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [operacionesTotal]);

  const operacionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return operacionesTotal.filter((op) => {
      const pasaBusqueda = !q || coincideConBusqueda(op, q);
      const pasaSucursal = !sucursalId || op.sucursalNombre === sucursalId;
      const pasaTipo = !tipoId || op.tipoId === tipoId;
      return pasaBusqueda && pasaSucursal && pasaTipo;
    });
  }, [busqueda, sucursalId, tipoId, operacionesTotal]);

  const totalMonto = useMemo(
    () => operacionesFiltradas.reduce((acc, op) => acc + op.monto, 0),
    [operacionesFiltradas]
  );

  return {
    operaciones: operacionesFiltradas,
    isLoading,
    busqueda,
    setBusqueda,
    sucursalId,
    setSucursalId,
    tipoId,
    setTipoId,
    sucursalOptions,
    tipoOptions,
    totalMonto,
  };
}
