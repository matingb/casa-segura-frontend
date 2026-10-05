'use client';
import { useState } from 'react';
import { cotizacionClient } from '../api/cotizacion.client';
import { ContextoMonetario } from '../types/Moneda';
import Modal from '../../components/ui/Modal/Modal';
import Button from '../../components/ui/Button/Button';
import { useToast } from '../../context/ToastContext';
interface Solicitud { contexto?: ContextoMonetario | null; conservar: () => void; actualizar: () => Promise<void> }
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
  // No cerrar la decisión al completar la comprobación de versión.
  const comprobar = async (solicitud: Solicitud) => {
    setOcupado(true);
    try {
      const vigente = await cotizacionClient.obtener();
      if (vigente.cotizacion_version !== solicitud.contexto?.cotizacion_version) setPendiente(solicitud);
      else solicitud.conservar();
    } catch (err) { showError(err instanceof Error ? err.message : 'No se pudo comprobar la cotización.'); }
    finally { setOcupado(false); }
  };
  const dialogo = pendiente ? <Modal title="Cambió la cotización de la lista" onClose={() => { if (!ocupado) setPendiente(null); }} footer={<>
    <Button variant="secondary" disabled={ocupado} onClick={() => setPendiente(null)}>Cancelar</Button>
    <Button variant="secondary" disabled={ocupado} onClick={() => void ejecutar(pendiente.conservar)}>Conservar vista anterior</Button>
    <Button disabled={ocupado} onClick={() => void ejecutar(pendiente.actualizar)}>Actualizar y regenerar</Button>
  </>}><p>El dólar cambió desde la última carga. Podés actualizar los precios o exportar los que estás viendo. El archivo identificará la versión {pendiente.contexto?.cotizacion_version ?? 'sin cotización'} de la vista que elijas.</p></Modal> : null;
  return { comprobar, ocupado, dialogo };
}
