'use client';
import { useId } from 'react';
import Link from 'next/link';
import { useCotizacion } from '../context/CotizacionContext';
import { PrecioEdicion, resolverPrecioVista } from '../lib/utils/precio';
import { PrecioResuelto } from '../lib/types/Moneda';
import { formatARS, formatUSD, formatFecha } from '../lib/utils/formatters';
import styles from './PrecioEditor.module.css';
export default function PrecioEditor({ value, onChange, original, heredado, readOnly = false, label = 'Precio' }: {
  value: PrecioEdicion; onChange: (value: PrecioEdicion) => void; original?: PrecioResuelto;
  heredado?: { ars: string | null; usd: string | null }; readOnly?: boolean; label?: string;
}) {
  const id = useId();
  const { datos, error, recargar } = useCotizacion();
  const contexto = value.cambiado ? value.contexto : datos ?? value.contexto;
  const precio = resolverPrecioVista(value.moneda, value.importe || null, contexto);
  const conflicto = value.cambiado && value.contexto?.cotizacion_version !== datos?.cotizacion_version;
  const cambiar = (importe: string) => onChange({ ...value, importe, contexto: value.cambiado ? value.contexto : datos ?? value.contexto, cambiado: true });
  return <fieldset className={styles.editor}>
    <legend>{label} · referencia {value.moneda}</legend>
    <div className={styles.campos}>
      <label htmlFor={`${id}-moneda`}>Moneda de referencia
        <select id={`${id}-moneda`} value={value.moneda} disabled={readOnly || (!contexto?.cotizacion_usd_ars && value.importe !== '' && original?.estado !== 'LEGADO_PENDIENTE_REVISION')} onChange={e => {
          const moneda = e.target.value as 'ARS' | 'USD';
          const key = moneda === 'ARS' ? 'ars' : 'usd';
          const importe = original?.estado === 'LEGADO_PENDIENTE_REVISION' && heredado?.[key] != null ? heredado[key]! : precio[key] ?? value.importe;
          onChange({ moneda, importe, contexto, cambiado: true });
        }}>
          <option value="ARS">Usar ARS como referencia</option><option value="USD">Usar USD como referencia</option>
        </select>
      </label>
      <label htmlFor={`${id}-importe`}>Importe principal {value.moneda}
        <input id={`${id}-importe`} type="number" min="0" step={value.moneda === 'ARS' ? '0.01' : '0.0001'} value={value.importe} readOnly={readOnly} onChange={e => cambiar(e.target.value)} placeholder="Sin precio" />
      </label>
    </div>
    <p>ARS {formatARS(precio.ars)} · USD {formatUSD(precio.usd)} <span className={styles.secundario}>Equivalente calculado</span></p>
    <p className={styles.secundario}>{contexto?.cotizacion_usd_ars ? `1 USD = ARS ${Number(contexto.cotizacion_usd_ars).toLocaleString('es-AR', { maximumFractionDigits: 6 })} · versión ${contexto.cotizacion_version} · ${formatFecha(contexto.actualizada_at ?? '')}` : 'Configurá el valor del dólar para calcular el equivalente.'} <Link href="/configuracion?tab=cotizacion">Configurar cotización</Link></p>
    {original?.estado === 'LEGADO_PENDIENTE_REVISION' && <div className={styles.aviso}>
      <p>Precio heredado pendiente de revisión. Original ARS {formatARS(heredado?.ars)} · USD {formatUSD(heredado?.usd)}. Elegí la referencia y revisá el equivalente antes de guardar.</p>
      {!readOnly && !value.cambiado && <button type="button" onClick={() => cambiar(value.importe)}>Confirmar referencia {value.moneda}</button>}
    </div>}
    {!readOnly && value.cambiado && <p className={styles.secundario}>Se guardará el principal {value.moneda}; el otro importe cambiará con el dólar. Vaciar el importe quita el precio.</p>}
    {conflicto && !readOnly && <div className={styles.aviso} role="alert">Cambió la cotización. Tus datos se conservaron. <button type="button" onClick={async () => { const nueva = await recargar(); if (nueva) onChange({ ...value, contexto: nueva }); }}>Actualizar cotización y revisar</button></div>}
    {error && <p role="alert">{error} Se conserva la referencia anterior.</p>}
  </fieldset>;
}
