'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { ClienteRegion, Region } from '../../../../../lib/types/Region';
import { regionClient } from '../../../../../lib/api/region.client';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { formatARS, formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import Select from '../../../../../components/ui/Select/Select';
import ConfirmActionModal from '../../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { ListaPreciosClienteEstado } from '../ListaPreciosCliente/useListaPreciosCliente';
import { simularPrecio } from '../ListaPreciosCliente/simularPrecio';
import styles from './ClienteDescuentos.module.css';

interface Props {
  clienteId: string;
  sucursales: Array<{ id: string; nombre: string }>;
  regionesAsignadas: ClienteRegion[];
  lista: ListaPreciosClienteEstado;
  onChanged: () => Promise<void> | void;
}

export default function RegionSelector({ clienteId, sucursales, regionesAsignadas, lista, onChanged }: Props) {
  const { showSuccess, showError } = useToast();
  const [regionesPorSucursal, setRegionesPorSucursal] = useState<Record<string, Region[]>>({});
  const [cargando, setCargando] = useState(true);
  const [eleccion, setEleccion] = useState<Record<string, string>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [aQuitar, setAQuitar] = useState<ClienteRegion | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all(sucursales.map(async s => [s.id, await regionClient.obtenerPorSucursal(s.id, true)] as const))
      .then(pares => { if (!cancelado) setRegionesPorSucursal(Object.fromEntries(pares)); })
      .catch(() => { if (!cancelado) showError('No se pudieron cargar las regiones de los puntos de venta.'); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, [sucursales, showError]);

  const asignar = async (sucursalId: string, regionId: string, reemplaza: boolean) => {
    setGuardandoId(sucursalId);
    try {
      await clienteDescuentoClient.asignarRegion(clienteId, { sucursal_id: sucursalId, region_id: regionId });
      showSuccess(reemplaza ? 'Región reemplazada' : 'Región asignada');
      setEleccion(prev => ({ ...prev, [sucursalId]: '' }));
      await onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo asignar la región.');
    } finally {
      setGuardandoId(null);
    }
  };

  const quitar = async () => {
    if (!aQuitar) return;
    setGuardandoId(aQuitar.sucursalId);
    try {
      await clienteDescuentoClient.quitarRegion(clienteId, aQuitar.sucursalId);
      showSuccess('Región quitada');
      setAQuitar(null);
      await onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo quitar la región.');
    } finally {
      setGuardandoId(null);
    }
  };

  if (sucursales.length === 0) {
    return (
      <div className={styles.vacio}>
        <MapPin size={28} aria-hidden />
        <p>El cliente no tiene puntos de venta asignados. Asignale uno en Información del cliente para poder elegir su región.</p>
      </div>
    );
  }

  return (
    <div className={styles.nivel}>
      <div className={styles.regiones}>
        {sucursales.map(sucursal => {
          const asignada = regionesAsignadas.find(r => r.sucursalId === sucursal.id);
          const opciones = regionesPorSucursal[sucursal.id] ?? [];
          const elegidaId = eleccion[sucursal.id] ?? '';
          const elegida = opciones.find(o => o.id === elegidaId);
          const guardando = guardandoId === sucursal.id;
          const puedeAsignar = Boolean(elegida) && elegidaId !== asignada?.regionId && !guardando;
          // La vista previa usa los precios del punto de venta que se está mirando.
          const ejemplo = lista.sucursalId === sucursal.id ? lista.items[0] : undefined;
          const vistaPrevia = ejemplo && elegida ? simularPrecio(ejemplo, { 'region-cliente': Number(elegida.descuento) || null }) : null;
          return (
            <div key={sucursal.id} className={styles.regionFila}>
              <div className={styles.regionInfo}>
                <span className={styles.nombre}>{sucursal.nombre}</span>
                {asignada ? (
                  <span className={styles.regionActual}>{asignada.regionNombre} · {formatPorcentaje(Number(asignada.descuento))}</span>
                ) : (
                  <span className={styles.muted}>Sin región</span>
                )}
              </div>
              <div className={styles.regionForm}>
                <div className={styles.regionSelect}>
                  <Select
                    id={`region-${sucursal.id}`}
                    aria-label={`Región para ${sucursal.nombre}`}
                    value={elegidaId}
                    onChange={(e) => setEleccion(prev => ({ ...prev, [sucursal.id]: e.target.value }))}
                    disabled={cargando || guardando || opciones.length === 0}
                  >
                    <option value="">{cargando ? 'Cargando…' : opciones.length === 0 ? 'Este punto de venta no tiene regiones' : asignada ? 'Cambiar región…' : 'Elegí una región'}</option>
                    {opciones.map(o => <option key={o.id} value={o.id}>{o.nombre} ({formatPorcentaje(Number(o.descuento))})</option>)}
                  </Select>
                </div>
                <button type="button" className={styles.btnAsignar} disabled={!puedeAsignar} onClick={() => elegida && void asignar(sucursal.id, elegida.id, Boolean(asignada))}>
                  {asignada ? 'Reemplazar' : 'Asignar'}
                </button>
                {asignada && (
                  <button type="button" className={styles.btnQuitar} onClick={() => setAQuitar(asignada)} disabled={guardando}>Quitar</button>
                )}
              </div>
              {elegida && elegidaId !== asignada?.regionId && (
                <div className={styles.contexto} aria-live="polite">
                  {asignada && <p className={styles.avisoReemplazo}>Hoy tiene {asignada.regionNombre} ({formatPorcentaje(Number(asignada.descuento))}). Si asignás, se reemplaza.</p>}
                  <p>Se aplica a todos los productos de {sucursal.nombre}.</p>
                  {ejemplo && vistaPrevia && (
                    <p className={styles.vistaPrevia}>
                      Ejemplo: {ejemplo.nombre} pasa de {formatARS(ejemplo.precioFinalArs)} a <strong>{formatARS(vistaPrevia.precioFinal)}</strong> ({formatPorcentaje(vistaPrevia.descuentoTotal)} total)
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {aQuitar && (
        <ConfirmActionModal
          title="Quitar región"
          description={`¿Quitar la región ${aQuitar.regionNombre} de ${aQuitar.sucursalNombre}? Los precios de ese punto de venta dejan de tener su descuento de ${formatPorcentaje(Number(aQuitar.descuento))}.`}
          confirmLabel="Quitar"
          isConfirming={guardandoId === aQuitar.sucursalId}
          onConfirm={quitar}
          onClose={() => setAQuitar(null)}
        />
      )}
    </div>
  );
}
