'use client';
import { KeyboardEvent, useId } from 'react';
import Link from 'next/link';
import Input from './ui/Input/Input';
import Select from './ui/Select/Select';
import Button from './ui/Button/Button';
import { useCotizacion } from '../context/CotizacionContext';
import { PrecioEdicion, resolverPrecioVista } from '../lib/utils/precio';
import { ContextoMonetario, Moneda, PrecioResuelto } from '../lib/types/Moneda';
import { formatARS, formatPrecio, formatUSD } from '../lib/utils/formatters';
import styles from './PrecioEditor.module.css';

export function textoCotizacion(contexto: ContextoMonetario | null | undefined): string | null {
  if (!contexto?.cotizacion_usd_ars) return null;
  const tasa = Number(contexto.cotizacion_usd_ars).toLocaleString('es-AR', { maximumFractionDigits: 6 });
  return `1 USD = $ ${tasa} · versión ${contexto.cotizacion_version}`;
}

/**
 * Campos de precio con moneda de referencia ARS/USD. Se renderiza como celdas
 * del grid del formulario que lo contiene: importe + moneda y el equivalente
 * calculado. Los avisos (precio heredado, cambio de cotización) ocupan una
 * fila completa solo cuando aparecen.
 */
export default function PrecioEditor({ value, onChange, original, heredado, sugerencia, label = 'Precio', tipo = 'precio', tabIndex, onKeyDown }: {
  value: PrecioEdicion; onChange: (value: PrecioEdicion) => void; original?: PrecioResuelto;
  heredado?: { ars: string | null; usd: string | null };
  /** Precio que se puede copiar explícitamente (ej.: el global al configurar una sucursal). */
  sugerencia?: { etiqueta: string; precio: PrecioResuelto };
  label?: string;
  /** Un costo en ARS no depende del dólar: no pide confirmar la cotización. */
  tipo?: 'precio' | 'costo';
  tabIndex?: number; onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const id = useId();
  const { datos, error, recargar } = useCotizacion();
  const dependeDelDolar = tipo === 'precio' || value.moneda === 'USD';
  // Un borrador que depende del dólar conserva la cotización con la que se cargó.
  const contexto = value.cambiado && dependeDelDolar ? value.contexto : datos ?? value.contexto;
  const precio = resolverPrecioVista(value.moneda, value.importe || null, contexto);
  const conflicto = dependeDelDolar && value.cambiado && value.contexto?.cotizacion_version !== datos?.cotizacion_version;
  const legado = original?.estado === 'LEGADO_PENDIENTE_REVISION';
  const otra: Moneda = value.moneda === 'ARS' ? 'USD' : 'ARS';
  const equivalente = otra === 'ARS' ? precio.ars : precio.usd;
  const cotizacion = textoCotizacion(contexto);
  const sugerenciaImporte = sugerencia?.precio.importe_referencia ?? null;

  const cambiar = (importe: string) => onChange({ ...value, importe, contexto: value.cambiado ? value.contexto : datos ?? value.contexto, cambiado: true });
  const cambiarMoneda = (moneda: Moneda) => {
    const key = moneda === 'ARS' ? 'ars' : 'usd';
    const importe = legado && heredado?.[key] != null ? heredado[key]! : precio[key] ?? value.importe;
    onChange({ moneda, importe, contexto, cambiado: true });
  };

  return <>
    <div className={styles.celda}>
      <div className={styles.conMoneda}>
        <Input
          id={`${id}-importe`}
          label={label}
          type="number"
          min="0"
          step={value.moneda === 'ARS' ? '0.01' : '0.0001'}
          value={value.importe}
          onChange={e => cambiar(e.target.value)}
          placeholder="Sin precio"
          tabIndex={tabIndex}
          onKeyDown={onKeyDown}
        />
        <Select
          id={`${id}-moneda`}
          label="Moneda"
          value={value.moneda}
          disabled={!contexto?.cotizacion_usd_ars && value.importe !== '' && !legado}
          onChange={e => cambiarMoneda(e.target.value as Moneda)}
          tabIndex={tabIndex}
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </Select>
      </div>
      {sugerencia && <p className={styles.ayuda}>
        {sugerencia.etiqueta}: {sugerenciaImporte == null ? 'sin precio' : formatPrecio(sugerencia.precio.moneda_referencia, sugerenciaImporte)}
        {sugerenciaImporte != null && <> · <button type="button" className={styles.accion} onClick={() => onChange({ moneda: sugerencia.precio.moneda_referencia, importe: sugerenciaImporte, contexto: datos ?? value.contexto, cambiado: true })}>Copiar</button></>}
      </p>}
    </div>

    <div className={styles.celda}>
      <Input
        id={`${id}-equivalente`}
        label={`Equivalente ${otra}`}
        value={equivalente != null ? formatPrecio(otra, equivalente) : value.importe !== '' ? 'Sin cotización' : ''}
        placeholder="—"
        readOnly
        tabIndex={-1}
        className={styles.calculado}
      />
      <p className={styles.ayuda}>
        {cotizacion ?? 'Configurá el valor del dólar para calcular el equivalente.'}
        {' · '}<Link href="/configuracion?tab=cotizacion">{cotizacion ? 'Cambiar' : 'Configurar'}</Link>
      </p>
    </div>

    {legado && <div className={styles.aviso}>
      <span>Precio heredado pendiente de revisión. Original: ARS {formatARS(heredado?.ars)} · USD {formatUSD(heredado?.usd)}. Elegí la moneda de referencia y revisá el equivalente antes de guardar.</span>
      {!value.cambiado && <Button type="button" variant="secondary" onClick={() => cambiar(value.importe)}>Confirmar referencia {value.moneda}</Button>}
    </div>}
    {conflicto && <div className={styles.aviso} role="alert">
      <span>Cambió la cotización. Tus datos se conservaron; revisá el equivalente antes de guardar.</span>
      <Button type="button" variant="secondary" onClick={async () => { const nueva = await recargar(); if (nueva) onChange({ ...value, contexto: nueva }); }}>Actualizar cotización y revisar</Button>
    </div>}
    {error && <p className={styles.error} role="alert">{error} Se conserva la referencia anterior.</p>}
  </>;
}
