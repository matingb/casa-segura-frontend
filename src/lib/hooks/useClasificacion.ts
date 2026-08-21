'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tipo } from '../types/Tipo';
import { Subtipo } from '../types/Subtipo';
import { clasificacionClient } from '../api/clasificacion.client';

interface UseClasificacionResult {
  tipos: Tipo[];
  subtipos: Subtipo[];
  loading: boolean;
  error: string | null;
  getSubtipoNombre: (subtipoId: string) => string;
  getTipoIdDeSubtipo: (subtipoId: string) => string | undefined;
  getTipoNombre: (tipoId: string) => string;
  getSubtiposPorTipo: (tipoId: string) => Subtipo[];
}

export function useClasificacion(): UseClasificacionResult {
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [subtipos, setSubtipos] = useState<Subtipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tiposData, subtiposData] = await Promise.all([
        clasificacionClient.obtenerTipos(),
        clasificacionClient.obtenerSubtipos(),
      ]);
      setTipos(tiposData);
      setSubtipos(subtiposData);
    } catch (err) {
      console.error('[useClasificacion] Error cargando clasificación:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar tipos y subtipos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSubtipoNombre = useCallback(
    (subtipoId: string) => subtipos.find((s) => s.id === subtipoId)?.nombre ?? 'Sin subtipo',
    [subtipos]
  );

  const getTipoIdDeSubtipo = useCallback(
    (subtipoId: string) => subtipos.find((s) => s.id === subtipoId)?.tipoId,
    [subtipos]
  );

  const getTipoNombre = useCallback(
    (tipoId: string) => tipos.find((t) => t.id === tipoId)?.nombre ?? 'Sin tipo',
    [tipos]
  );

  const getSubtiposPorTipo = useCallback(
    (tipoId: string) => subtipos.filter((s) => s.tipoId === tipoId),
    [subtipos]
  );

  return useMemo(
    () => ({ tipos, subtipos, loading, error, getSubtipoNombre, getTipoIdDeSubtipo, getTipoNombre, getSubtiposPorTipo }),
    [tipos, subtipos, loading, error, getSubtipoNombre, getTipoIdDeSubtipo, getTipoNombre, getSubtiposPorTipo]
  );
}
