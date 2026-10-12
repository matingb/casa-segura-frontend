'use client';
import { useState } from 'react';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import { useCotizacion } from '../../../../context/CotizacionContext';
import { cotizacionClient, CatalogoApiError } from '../../../../lib/api/cotizacion.client';
import { useToast } from '../../../../context/ToastContext';
import { formatFecha } from '../../../../lib/utils/formatters';
import styles from './CotizacionConfiguracion.module.css';

/** La cotización admite hasta 6 decimales: no se redondea a centavos como un precio. */
function formatCotizacion(valor: string): string {
  return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

export default function CotizacionConfiguracion() {
  const { datos, error, recargar } = useCotizacion();
  const { showSuccess } = useToast();
  const [borrador, setBorrador] = useState<{ valor: string; version: string } | null>(null);
  const valor = borrador?.valor ?? (datos?.cotizacion_usd_ars != null ? String(Number(datos.cotizacion_usd_ars)) : '');
  const version = borrador?.version ?? datos?.cotizacion_version ?? '0';
  const editado = borrador !== null;
  const setValor = (nuevo: string) => setBorrador({ valor: nuevo, version });
  const setVersion = (nueva: string) => setBorrador({ valor, version: nueva });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const conflicto = editado && datos && version !== datos.cotizacion_version;
  const puedeActualizar = datos?.puede_actualizar ?? false;
  const sugerencias = datos?.cotizacion_usd_ars == null
    ? (datos?.sugerencias_sucursales ?? []).filter(s => s.valor_dolar != null && Number(s.valor_dolar) > 0)
    : [];

  return <Card title="Cotización del dólar">
    <div className={styles.contenido}>
      <p className={styles.intro}>
        Referencia manual única para toda la empresa. Al cambiarla se recalculan los equivalentes en ARS y USD;
        los precios cargados en su moneda de referencia no se modifican.
      </p>
      {error && <p role="alert" className={styles.alertaError}>{error}</p>}

      <section className={styles.vigente} aria-labelledby="cotizacion-vigente">
        <span id="cotizacion-vigente" className={styles.etiqueta}>Cotización vigente</span>
        {datos?.cotizacion_usd_ars != null ? (
          <p className={styles.valor}>
            <span className={styles.valorUnidad}>1 USD =</span>
            <span className={styles.valorImporte}>$ {formatCotizacion(datos.cotizacion_usd_ars)}</span>
          </p>
        ) : (
          <p className={styles.valorVacio}>Sin cotización configurada</p>
        )}
        {datos?.cotizacion_usd_ars != null && (
          <dl className={styles.meta}>
            <div className={styles.metaItem}>
              <dt>Actualizada</dt>
              <dd>{formatFecha(datos.actualizada_at ?? '')}</dd>
            </div>
            {datos.actualizada_por_nombre && (
              <div className={styles.metaItem}>
                <dt>Por</dt>
                <dd>{datos.actualizada_por_nombre}</dd>
              </div>
            )}
            <div className={styles.metaItem}>
              <dt>Versión</dt>
              <dd>{datos.cotizacion_version}</dd>
            </div>
          </dl>
        )}
      </section>

      <form className={styles.formulario} aria-labelledby="cotizacion-actualizar" onSubmit={async e => {
        e.preventDefault(); if (guardando) return;
        setGuardando(true); setMensaje(null);
        try { await cotizacionClient.actualizar(valor, version); setBorrador(null); await recargar(); showSuccess('Cotización actualizada.'); }
        catch (err) { setMensaje(err instanceof Error ? err.message : 'No se pudo guardar.'); if (err instanceof CatalogoApiError && err.code === 'COTIZACION_CAMBIO') await recargar(); }
        finally { setGuardando(false); }
      }}>
        <div className={styles.formularioEncabezado}>
          <h3 id="cotizacion-actualizar" className={styles.seccionTitulo}>Actualizar cotización</h3>
          {!puedeActualizar && <p className={styles.aviso}>Necesitás el permiso de administración de cotización para modificar este valor.</p>}
        </div>

        <div className={styles.campo}>
          <Input label="Pesos argentinos por 1 USD" type="number" min="0.000001" step="0.000001" required value={valor} onChange={e => { setValor(e.target.value); }} disabled={!puedeActualizar || guardando} />
          <p className={styles.ayuda}>Admite hasta 6 decimales.</p>
        </div>

        {sugerencias.length > 0 && <div className={styles.sugerencias}>
          <span className={styles.etiqueta}>Valores anteriores por sucursal</span>
          <p className={styles.ayuda}>Elegí explícitamente una sugerencia o ingresá la referencia de empresa.</p>
          <div className={styles.sugerenciasLista}>
            {sugerencias.map(s => <Button key={s.id} type="button" variant="secondary" disabled={!puedeActualizar || guardando} onClick={() => { setValor(s.valor_dolar!); }}>{s.nombre}: $ {formatCotizacion(s.valor_dolar!)}</Button>)}
          </div>
        </div>}

        {conflicto && <div role="alert" className={styles.alertaConflicto}>
          <p>Otra persona actualizó el dólar. Tu importe se conserva.</p>
          <Button type="button" variant="secondary" onClick={() => { setVersion(datos!.cotizacion_version); setMensaje(null); }}>Revisar con la versión {datos!.cotizacion_version}</Button>
        </div>}
        {mensaje && <p role="alert" className={styles.alertaError}>{mensaje}</p>}

        <div className={styles.acciones}>
          <Button type="submit" disabled={!puedeActualizar || guardando || !!conflicto}>{guardando ? 'Guardando…' : 'Guardar cotización'}</Button>
        </div>
      </form>
    </div>
  </Card>;
}
