'use client';
import { useState } from 'react';
import { cotizacionClient } from '../api/cotizacion.client';
import { ContextoMonetario } from '../types/Moneda';
import { formatARS } from '../utils/formatters';
import Modal from '../../components/ui/Modal/Modal';
import Button from '../../components/ui/Button/Button';
import { useToast } from '../../context/ToastContext';

interface Solicitud { contexto?: ContextoMonetario | null; conservar: () => void | Promise<void>; actualizar: () => Promise<void> }

export function useExportacionCotizacion() {
  const [pendiente, setPendiente] = useState<Solicitud | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { showError } = useToast();

  const ejecutar = async (action: () => void | Promise<void>) => {
    setOcupado(true);
    try { await action(); setPendiente(null); }
    catch (err) { showError(err instanceof Error ? err.message : 'No se pudo generar el archivo.'); }
    finally { setOcupado(false); }
  };

  const comprobar = async (solicitud: Solicitud) => {
    setOcupado(true);
    try {
      const contexto = solicitud.contexto;
      const vigente = await cotizacionClient.obtener(contexto?.sucursal_id);
      const sigueVigente = vigente.cotizacion_version === contexto?.cotizacion_version &&
        vigente.sucursal_id === contexto?.sucursal_id && vigente.origen === contexto?.origen &&
        vigente.cotizacion_usd_ars === contexto?.cotizacion_usd_ars;
      if (!sigueVigente) setPendiente(solicitud);
      else await solicitud.conservar();
    } catch (err) { showError(err instanceof Error ? err.message : 'No se pudo comprobar la cotización.'); }
    finally { setOcupado(false); }
  };

  const dialogo = pendiente ? <Modal title="Cambió la cotización de la lista"
    onClose={() => { if (!ocupado) setPendiente(null); }} footer={<>
      <Button variant="secondary" disabled={ocupado} onClick={() => setPendiente(null)}>Cancelar</Button>
      <Button variant="secondary" disabled={ocupado} onClick={() => void ejecutar(pendiente.conservar)}>Conservar vista anterior</Button>
      <Button disabled={ocupado} onClick={() => void ejecutar(pendiente.actualizar)}>Actualizar y regenerar</Button>
    </>}>
    <p>La cotización del {pendiente.contexto?.sucursal_id
      ? `PDV ${pendiente.contexto.sucursal_nombre ?? ''}`
      : 'catálogo general'} cambió desde la última carga. Podés actualizar los precios o exportar los que estás viendo.
      La vista corresponde a 1 USD = {formatARS(pendiente.contexto?.cotizacion_usd_ars)}
      ({pendiente.contexto?.origen === 'SUCURSAL' ? 'propia del PDV' : 'general'}).</p>
  </Modal> : null;

  return { comprobar, ocupado, dialogo };
}
