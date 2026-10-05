'use client';
import Link from 'next/link';
import { ContextoMonetario } from '../lib/types/Moneda';
import { formatFecha } from '../lib/utils/formatters';
export default function ContextoPrecios({ contexto, error, legado = false }: { contexto?: ContextoMonetario | null; error?: string | null; legado?: boolean }) {
  return <div style={{ fontSize: '0.875rem', padding: '10px 0', lineHeight: 1.6 }} aria-live="polite">
    <p>{contexto?.cotizacion_usd_ars ? `1 USD = ARS ${Number(contexto.cotizacion_usd_ars).toLocaleString('es-AR', { maximumFractionDigits: 6 })} · versión ${contexto.cotizacion_version} · actualizada ${formatFecha(contexto.actualizada_at ?? '')}` : 'Configurá el valor del dólar para calcular el equivalente USD.'} <Link href="/configuracion?tab=cotizacion">Configurar cotización</Link></p>
    {legado && <p>Hay precios heredados pendientes de revisión. Se muestra ARS como referencia provisional; los originales se conservan en el detalle.</p>}
    {error && <p role="alert">{error} La vista conserva los precios y la referencia de la última carga.</p>}
  </div>;
}
