'use client';
import { useState } from 'react';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import ContextoPrecios from '../../../../components/ContextoPrecios';
import { useCotizacion } from '../../../../context/CotizacionContext';
import { cotizacionClient, CatalogoApiError } from '../../../../lib/api/cotizacion.client';
import { useToast } from '../../../../context/ToastContext';
export default function CotizacionConfiguracion() {
  const { datos, error, recargar } = useCotizacion();
  const { showSuccess } = useToast();
  const [borrador, setBorrador] = useState<{ valor: string; version: string } | null>(null);
  const valor = borrador?.valor ?? datos?.cotizacion_usd_ars ?? '';
  const version = borrador?.version ?? datos?.cotizacion_version ?? '0';
  const editado = borrador !== null;
  const setValor = (nuevo: string) => setBorrador({ valor: nuevo, version });
  const setVersion = (nueva: string) => setBorrador({ valor, version: nueva });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const conflicto = editado && datos && version !== datos.cotizacion_version;
  return <Card title="Cotización de la empresa">
    <p>Una referencia manual para todos los productos y sucursales. Cambiar el dólar actualiza los equivalentes; los precios principales se conservan.</p>
    <ContextoPrecios contexto={datos} error={error} />
    {datos?.actualizada_por_nombre && <p>Última actualización por {datos.actualizada_por_nombre}.</p>}
    {!datos?.puede_actualizar && <p>Necesitás el permiso de administración de cotización para modificar este valor.</p>}
    <form onSubmit={async e => {
      e.preventDefault(); if (guardando) return;
      setGuardando(true); setMensaje(null);
      try { await cotizacionClient.actualizar(valor, version); setBorrador(null); await recargar(); showSuccess('Cotización actualizada.'); }
      catch (err) { setMensaje(err instanceof Error ? err.message : 'No se pudo guardar.'); if (err instanceof CatalogoApiError && err.code === 'COTIZACION_CAMBIO') await recargar(); }
      finally { setGuardando(false); }
    }} style={{ display: 'grid', gap: 16, maxWidth: 580 }}>
      <Input label="1 USD equivale a ARS" type="number" min="0.000001" step="0.000001" required value={valor} onChange={e => { setValor(e.target.value); }} disabled={!datos?.puede_actualizar || guardando} />
      {datos?.cotizacion_usd_ars == null && datos?.sugerencias_sucursales.some(s => s.valor_dolar != null) && <div>
        <p>Valores anteriores por sucursal. Elegí explícitamente una sugerencia o ingresá la referencia de empresa.</p>
        {datos.sugerencias_sucursales.filter(s => s.valor_dolar != null && Number(s.valor_dolar) > 0).map(s => <Button key={s.id} type="button" variant="secondary" disabled={!datos.puede_actualizar || guardando} onClick={() => { setValor(s.valor_dolar!); }}>{s.nombre}: ARS {s.valor_dolar}</Button>)}
      </div>}
      {conflicto && <p role="alert">Otra persona actualizó el dólar. Tu importe se conserva. <Button type="button" variant="secondary" onClick={() => { setVersion(datos!.cotizacion_version); setMensaje(null); }}>Revisar con la versión {datos!.cotizacion_version}</Button></p>}
      {mensaje && <p role="alert">{mensaje}</p>}
      <Button type="submit" disabled={!datos?.puede_actualizar || guardando || !!conflicto}>{guardando ? 'Guardando…' : 'Guardar cotización'}</Button>
    </form>
  </Card>;
}
