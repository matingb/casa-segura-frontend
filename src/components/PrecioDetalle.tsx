'use client';
import DetailField from './ui/DetailField/DetailField';
import { textoCotizacion } from './PrecioEditor';
import { ContextoMonetario, Moneda, PrecioResuelto } from '../lib/types/Moneda';
import { formatARS, formatPrecio, formatUSD } from '../lib/utils/formatters';
import styles from './PrecioEditor.module.css';

/**
 * Vista de solo lectura de un precio con moneda de referencia. Se renderiza como
 * DetailField(s) del grid que lo contiene: el importe principal y su equivalente
 * calculado, o ambos en un solo campo cuando es `compacto`.
 */
export default function PrecioDetalle({ label, precio, contexto, heredado, compacto = false }: {
  label: string; precio?: PrecioResuelto | null; contexto?: ContextoMonetario | null;
  heredado?: { ars: string | null; usd: string | null }; compacto?: boolean;
}) {
  const moneda: Moneda = precio?.moneda_referencia ?? 'ARS';
  const otra: Moneda = moneda === 'ARS' ? 'USD' : 'ARS';
  const tienePrecio = precio?.importe_referencia != null;
  const principal = tienePrecio ? formatPrecio(moneda, precio!.importe_referencia) : '—';
  const valorEquivalente = otra === 'ARS' ? precio?.ars : precio?.usd;
  const equivalente = !tienePrecio ? '—' : valorEquivalente != null ? formatPrecio(otra, valorEquivalente) : 'Sin cotización';
  const legado = precio?.estado === 'LEGADO_PENDIENTE_REVISION';
  const cotizacion = textoCotizacion(contexto);

  const subPrincipal = legado
    ? <span className={`${styles.sub} ${styles.subAviso}`}>Heredado, pendiente de revisión · original ARS {formatARS(heredado?.ars)} · USD {formatUSD(heredado?.usd)}</span>
    : tienePrecio && <span className={styles.sub}>Referencia {moneda}</span>;

  if (compacto) {
    return <DetailField label={label}>
      {principal}
      {tienePrecio && <span className={styles.sub}>≈ {equivalente}</span>}
      {legado && subPrincipal}
    </DetailField>;
  }

  return <>
    <DetailField label={label}>{principal}{subPrincipal}</DetailField>
    <DetailField label={`Equivalente ${otra}`}>
      {equivalente}
      {tienePrecio && cotizacion && <span className={styles.sub}>{cotizacion}</span>}
    </DetailField>
  </>;
}
