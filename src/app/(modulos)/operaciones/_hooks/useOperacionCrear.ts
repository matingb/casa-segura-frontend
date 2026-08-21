'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { operacionesClient } from '../../../../lib/api/operaciones.client';
import { OperacionCrearInput } from '../../../../lib/types/OperacionCrear';

interface UseOperacionCrearResult {
  submitting: boolean;
  error: string | null;
  crear: (input: OperacionCrearInput) => Promise<void>;
}

export function useOperacionCrear(): UseOperacionCrearResult {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(
    async (input: OperacionCrearInput) => {
      setSubmitting(true);
      setError(null);
      try {
        const operacion = await operacionesClient.crear(input);
        router.push(`/operaciones/${operacion.id}`);
      } catch (err) {
        console.error('[useOperacionCrear] Error creando operación:', err);
        setError(err instanceof Error ? err.message : 'Error al crear la operación');
      } finally {
        setSubmitting(false);
      }
    },
    [router]
  );

  return { submitting, error, crear };
}
