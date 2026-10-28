'use client';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { ContextoMonetario } from '../lib/types/Moneda';
import { formatFecha } from '../lib/utils/formatters';
import styles from './ContextoPrecios.module.css';

export default function ContextoPrecios({ contexto, error, legado = false }: { contexto?: ContextoMonetario | null; error?: string | null; legado?: boolean }) {
  return <div className={styles.contexto} aria-live="polite">
    <p className={`${styles.aviso} ${styles.info}`}>
      <Info size={15} className={styles.icono} aria-hidden="true" />
      <span>
        {contexto?.cotizacion_usd_ars ? `1 USD = ARS ${Number(contexto.cotizacion_usd_ars).toLocaleString('es-AR', { maximumFractionDigits: 6 })} · versión ${contexto.cotizacion_version} · actualizada ${formatFecha(contexto.actualizada_at ?? '')}` : 'Configurá el valor del dólar para calcular el equivalente USD.'}
        <Link href="/configuracion?tab=cotizacion">Configurar cotización</Link>
      </span>
    </p>
    {legado && <p className={`${styles.aviso} ${styles.advertencia}`}>
      <AlertTriangle size={15} className={styles.icono} aria-hidden="true" />
      <span>Hay precios heredados pendientes de revisión. Se muestra ARS como referencia provisional; los originales se conservan en el detalle.</span>
    </p>}
    {error && <p className={`${styles.aviso} ${styles.error}`} role="alert">
      <AlertCircle size={15} className={styles.icono} aria-hidden="true" />
      <span>{error} La vista conserva los precios y la referencia de la última carga.</span>
    </p>}
  </div>;
}
