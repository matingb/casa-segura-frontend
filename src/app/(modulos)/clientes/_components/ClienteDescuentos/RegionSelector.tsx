'use client';

import { useEffect, useState } from 'react';
import { ClienteRegion, Region } from '../../../../../lib/types/Region';
import { regionClient } from '../../../../../lib/api/region.client';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import styles from './ClienteDescuentos.module.css';

interface SucursalBasic {
  id: string;
  nombre: string;
}

interface Props {
  clienteId: string;
  sucursales: SucursalBasic[];
  regionesAsignadas: ClienteRegion[];
  onChanged: () => void;
}

export default function RegionSelector({
  clienteId,
  sucursales,
  regionesAsignadas,
  onChanged,
}: Props) {
  const { showSuccess, showError } = useToast();
  const [regionesPorSucursal, setRegionesPorSucursal] = useState<Record<string, Region[]>>({});
  const [loading, setLoading] = useState(false);
  const [savingSucursalId, setSavingSucursalId] = useState<string | null>(null);

  // Cargar las opciones de región para cada sucursal del cliente
  useEffect(() => {
    let cancel = false;

    async function loadRegiones() {
      if (sucursales.length === 0) return;
      setLoading(true);
      try {
        const mapa: Record<string, Region[]> = {};
        await Promise.all(
          sucursales.map(async (s) => {
            const regs = await regionClient.obtenerPorSucursal(s.id, true);
            mapa[s.id] = regs;
          })
        );
        if (!cancel) {
          setRegionesPorSucursal(mapa);
        }
      } catch (err) {
        if (!cancel) {
          showError('Error al cargar opciones de región para las sucursales.');
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    loadRegiones();
    return () => {
      cancel = true;
    };
  }, [sucursales, showError]);

  const handleAsignar = async (sucursalId: string, regionId: string) => {
    if (!regionId) return;
    setSavingSucursalId(sucursalId);
    try {
      await clienteDescuentoClient.asignarRegion(clienteId, {
        sucursal_id: sucursalId,
        region_id: regionId,
      });
      showSuccess('Región asignada correctamente.');
      onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al asignar región.');
    } finally {
      setSavingSucursalId(null);
    }
  };

  const handleQuitar = async (sucursalId: string) => {
    setSavingSucursalId(sucursalId);
    try {
      await clienteDescuentoClient.quitarRegion(clienteId, sucursalId);
      showSuccess('Región removida.');
      onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al quitar región.');
    } finally {
      setSavingSucursalId(null);
    }
  };

  if (sucursales.length === 0) {
    return (
      <div className={styles.emptyBlock}>
        El cliente no tiene sucursales asignadas. Asignale una sucursal para poder configurar su región.
      </div>
    );
  }

  return (
    <div className={styles.itemsList}>
      {sucursales.map((sucursal) => {
        const asignada = regionesAsignadas.find((r) => r.sucursalId === sucursal.id);
        const opciones = regionesPorSucursal[sucursal.id] ?? [];
        const isSaving = savingSucursalId === sucursal.id;

        return (
          <div key={sucursal.id} className={styles.itemCard}>
            <div className={styles.itemInfo}>
              <div>
                <span className={styles.itemName}>{sucursal.nombre}</span>
                <span className={styles.itemSub} style={{ display: 'block' }}>
                  Punto de venta
                </span>
              </div>

              {asignada ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className={styles.discountBadge}>
                    {asignada.regionNombre} (-{formatPorcentaje(asignada.descuento)})
                  </span>
                </div>
              ) : (
                <span className={styles.itemSub} style={{ fontStyle: 'italic' }}>
                  Sin región asignada
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <select
                className={styles.select}
                value={asignada ? asignada.regionId : ''}
                onChange={(e) => handleAsignar(sucursal.id, e.target.value)}
                disabled={loading || isSaving || opciones.length === 0}
                style={{ minWidth: '180px' }}
              >
                <option value="">
                  {opciones.length === 0
                    ? '(Sin regiones en esta sucursal)'
                    : '— Asignar región —'}
                </option>
                {opciones.map((opc) => (
                  <option key={opc.id} value={opc.id}>
                    {opc.nombre} (-{formatPorcentaje(opc.descuento)})
                  </option>
                ))}
              </select>

              {asignada && (
                <button
                  type="button"
                  className={styles.btnDangerOutline}
                  onClick={() => handleQuitar(sucursal.id)}
                  disabled={isSaving}
                  title="Quitar región asignada"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
