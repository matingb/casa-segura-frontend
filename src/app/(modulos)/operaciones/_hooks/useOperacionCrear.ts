'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { OperacionCrearInput } from '../../../../lib/types/OperacionCrear';
import { useToast } from '../../../../context/ToastContext';
import { useCotizacion } from '../../../../context/CotizacionContext';
import { CatalogoApiError } from '../../../../lib/api/cotizacion.client';

interface UseOperacionCrearResult {
  submitting: boolean;
  error: string | null;
  crear: (input: OperacionCrearInput) => Promise<void>;
}

export function useOperacionCrear(): UseOperacionCrearResult {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { recargar: recargarCotizacion } = useCotizacion();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (input: OperacionCrearInput) => {
      setSubmitting(true);
      setError(null);
      try {
        const operacion = await operacionesClient.crear(input);
        showSuccess('Operación registrada correctamente.');
        router.push(`/operaciones/${operacion.id}`);
      } catch (err) {
        if (err instanceof CatalogoApiError && err.code === 'COTIZACION_CAMBIO') await recargarCotizacion();
        showError(err instanceof Error ? err.message : 'No se pudo registrar la operación. Intenta nuevamente.');
        if (!(err instanceof CatalogoApiError)) console.error('[useOperacionCrear] Error creando operación:', err);
        setError(err instanceof Error ? err.message : 'Error al crear la operación');
      } finally {
        setSubmitting(false);
      }
    },
    [router, showError, showSuccess, recargarCotizacion]
  );

  return { submitting, error, crear };
}
