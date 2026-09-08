'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { OperacionCrearInput } from '../../../../lib/types/OperacionCrear';
import { useToast } from '../../../../context/ToastContext';

interface UseOperacionCrearResult {
  submitting: boolean;
  error: string | null;
  crear: (input: OperacionCrearInput) => Promise<void>;
}

export function useOperacionCrear(): UseOperacionCrearResult {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
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
        showError(err instanceof Error ? err.message : 'No se pudo registrar la operación. Intenta nuevamente.');
        console.error('[useOperacionCrear] Error creando operación:', err);
        setError(err instanceof Error ? err.message : 'Error al crear la operación');
      } finally {
        setSubmitting(false);
      }
    },
    [router, showError, showSuccess]
  );

  return { submitting, error, crear };
}
