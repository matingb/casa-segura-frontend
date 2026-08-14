import { useEffect, useMemo, useState } from 'react';
import { CuentaFinanciera } from '../../../../lib/types/CuentaFinanciera';
import { cuentaFinancieraClient } from '../../../../lib/api/cuenta-financiera.client';

interface UseCuentasFinancierasResult {
  cuentas: CuentaFinanciera[];
  isLoading: boolean;
  busqueda: string;
  setBusqueda: (valor: string) => void;
  totalSaldoActual: number;
}

export function useCuentasFinancieras(): UseCuentasFinancierasResult {
  const [busqueda, setBusqueda] = useState('');
  const [todasLasCuentas, setTodasLasCuentas] = useState<CuentaFinanciera[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    cuentaFinancieraClient
      .obtenerTodas()
      .then(setTodasLasCuentas)
      .catch((err) => {
        console.error('[useCuentasFinancieras] Error cargando cuentas:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const cuentasFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return todasLasCuentas;
    return todasLasCuentas.filter((c) =>
      c.nombre.toLowerCase().includes(term)
    );
  }, [busqueda, todasLasCuentas]);

  const totalSaldoActual = useMemo(
    () => cuentasFiltradas.reduce((sum, c) => sum + c.saldoActual, 0),
    [cuentasFiltradas]
  );

  return {
    cuentas: cuentasFiltradas,
    isLoading,
    busqueda,
    setBusqueda,
    totalSaldoActual,
  };
}
