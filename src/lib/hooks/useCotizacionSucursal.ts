'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cotizacionClient } from '../api/cotizacion.client';
import { Cotizacion } from '../types/Moneda';

interface Estado {
  sucursalId: string | null;
  datos: Cotizacion | null;
  error: string | null;
  revision: number;
  cargando: boolean;
}

const VACIO: Estado = { sucursalId: null, datos: null, error: null, revision: 0, cargando: false };

/** Lee la cotización efectiva de un PDV y descarta resultados de selecciones anteriores. */
export function useCotizacionSucursal(sucursalId?: string | null) {
  const id = sucursalId || null;
  const [estado, setEstado] = useState<Estado>(VACIO);
  const pedido = useRef(0);

  const recargar = useCallback(async () => {
    const actual = ++pedido.current;
    if (!id) {
      setEstado({ ...VACIO, sucursalId: null });
      return null;
    }
    setEstado((prev) => ({
      sucursalId: id,
      datos: prev.sucursalId === id ? prev.datos : null,
      error: null,
      revision: prev.revision,
      cargando: true,
    }));
    try {
      const datos = await cotizacionClient.obtener(id);
      if (actual === pedido.current) setEstado((prev) => ({ sucursalId: id, datos, error: null, revision: prev.revision + 1, cargando: false }));
      return datos;
    } catch (err) {
      if (actual === pedido.current) setEstado((prev) => ({
        sucursalId: id,
        datos: prev.sucursalId === id ? prev.datos : null,
        error: err instanceof Error ? err.message : 'No se pudo actualizar la cotización del PDV.',
        revision: prev.revision,
        cargando: false,
      }));
      return null;
    }
  }, [id]);

  useEffect(() => {
    pedido.current++;
    if (!id) {
      setEstado({ ...VACIO, sucursalId: null });
      return;
    }
    setEstado((prev) => ({ sucursalId: id, datos: null, error: null, revision: prev.revision, cargando: true }));
    const refrescarSiCorresponde = (event?: Event) => {
      const detalle = (event as CustomEvent<{ alcance?: string; sucursal_id?: string }> | undefined)?.detail;
      if (detalle?.alcance === 'SUCURSAL' && detalle.sucursal_id !== id) return;
      void recargar();
    };
    void recargar();
    window.addEventListener('focus', refrescarSiCorresponde);
    window.addEventListener('cotizacion-actualizada', refrescarSiCorresponde);
    const contador = pedido;
    return () => {
      contador.current++;
      window.removeEventListener('focus', refrescarSiCorresponde);
      window.removeEventListener('cotizacion-actualizada', refrescarSiCorresponde);
    };
  }, [id, recargar]);

  const coincide = estado.sucursalId === id;
  return {
    datos: coincide ? estado.datos : null,
    error: coincide ? estado.error : null,
    revision: coincide ? estado.revision : 0,
    cargando: id ? !coincide || estado.cargando : false,
    recargar,
  };
}
