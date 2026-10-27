'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Region, regionClient } from '../../../../lib/api/region.client';
import { Sucursal, sucursalClient } from '../../../../lib/api/sucursal.client';
import { useToast } from '../../../../context/ToastContext';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { formatPorcentaje } from '../../../../lib/utils/formatters';
import styles from './RegionesConfiguracion.module.css';

interface FormState {
  nombre: string;
  descuento: string;
  sucursalIds: string[];
}

const FORM_VACIO: FormState = { nombre: '', descuento: '', sucursalIds: [] };

export default function RegionesConfiguracion() {
  const { showSuccess, showError } = useToast();

  // Puntos de venta activos de la empresa (no solo los asignados al usuario).
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [eliminarTarget, setEliminarTarget] = useState<Region | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setRegiones(await regionClient.obtenerTodas());
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al cargar regiones');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    sucursalClient
      .obtenerParaAdmin(false)
      .then(setSucursales)
      .catch((err) => showError(err instanceof Error ? err.message : 'Error al cargar los puntos de venta'));
  }, [showError]);

  const abrirCreacion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setCreando(true);
  };

  const abrirEdicion = (r: Region) => {
    setCreando(false);
    setEditandoId(r.id);
    setForm({
      nombre: r.nombre,
      descuento: String(r.descuento),
      sucursalIds: r.sucursales.map((s) => s.id),
    });
  };

  const cerrarForm = () => {
    setCreando(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
  };

  const guardar = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      showError('El nombre de la región es obligatorio.');
      return;
    }
    const descuento = Number(form.descuento);
    if (form.descuento.trim() === '' || !Number.isFinite(descuento) || descuento < 0 || descuento > 100) {
      showError('El descuento debe ser un porcentaje entre 0% y 100%.');
      return;
    }
    if (form.sucursalIds.length === 0) {
      showError('Elegí al menos un punto de venta para la región.');
      return;
    }

    setGuardando(true);
    try {
      if (editandoId) {
        await regionClient.actualizar(editandoId, { nombre, descuento, sucursal_ids: form.sucursalIds });
        showSuccess('Región actualizada exitosamente.');
      } else {
        await regionClient.crear({ nombre, descuento, sucursal_ids: form.sucursalIds });
        showSuccess('Región creada exitosamente.');
      }
      cerrarForm();
      await cargar();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al guardar la región');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminarTarget) return;
    setEliminando(true);
    try {
      await regionClient.eliminar(eliminarTarget.id);
      showSuccess(`Región "${eliminarTarget.nombre}" dada de baja.`);
      setEliminarTarget(null);
      await cargar();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al eliminar la región');
    } finally {
      setEliminando(false);
    }
  };

  const formulario = (
    <div className={styles.formCard} role="region" aria-label="Formulario de región">
      <h3 className={styles.formTitle}>{creando ? 'Nueva región' : 'Editar región'}</h3>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Nombre de la región<span className={styles.required}>*</span>
          </span>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej: Interior Buenos Aires, Cuyo, Litoral"
            autoFocus
            maxLength={100}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Descuento (%)<span className={styles.required}>*</span>
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.descuento}
            onChange={(e) => setForm((prev) => ({ ...prev, descuento: e.target.value }))}
            placeholder="Ej: 5"
          />
          <span className={styles.hint}>% sobre el saldo tras descuentos de producto. Puede ser 0%.</span>
        </label>
      </div>

      <fieldset className={styles.puntosVenta}>
        <legend className={styles.fieldLabel}>
          Puntos de venta<span className={styles.required}>*</span>
        </legend>
        {(() => {
          // Un punto de venta dado de baja que ya estaba en la región se sigue mostrando.
          const opciones = [
            ...sucursales.map((s) => ({ id: s.id, nombre: s.nombre })),
            ...regiones
              .flatMap((r) => (r.id === editandoId ? r.sucursales : []))
              .filter((s) => !sucursales.some((a) => a.id === s.id)),
          ];
          return opciones.length === 0 ? (
            <span className={styles.hint}>Cargando puntos de venta...</span>
          ) : (
            <div className={styles.puntosVentaGrid}>
              {opciones.map((s) => (
                <label key={s.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={form.sucursalIds.includes(s.id)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sucursalIds: e.target.checked
                          ? [...prev.sucursalIds, s.id]
                          : prev.sucursalIds.filter((id) => id !== s.id),
                      }))
                    }
                    disabled={guardando}
                  />
                  {s.nombre}
                </label>
              ))}
            </div>
          );
        })()}
        <span className={styles.hint}>Una región puede agrupar uno o más puntos de venta.</span>
      </fieldset>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnSecondary} onClick={cerrarForm} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className={styles.btnPrimary} onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar región'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerToolbar}>
        <div className={styles.toolbarInfo}>
          <h2 className={styles.toolbarTitle}>Regiones</h2>
          <p className={styles.toolbarDescription}>
            Configurá las regiones geográficas, sus descuentos y los puntos de venta que agrupa cada una.
          </p>
        </div>

        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={abrirCreacion}
            disabled={creando || loading}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nueva región</span>
          </button>
        </div>
      </div>

      {creando && formulario}

      {/* Lista de regiones */}
      {loading ? (
        <div className={styles.loadingState}>
          <p>Cargando regiones...</p>
        </div>
      ) : regiones.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No hay regiones configuradas.</p>
          <p>Creá regiones para asignar a tus clientes y aplicar descuentos geográficos automáticos.</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {regiones.map((r) =>
            editandoId === r.id ? (
              <div key={r.id}>{formulario}</div>
            ) : (
              <div key={r.id} className={`${styles.fila} ${!r.activo ? styles.filaInactiva : ''}`}>
                <div className={styles.filaInfo}>
                  <div className={styles.filaNombre}>
                    <span className={styles.nombre}>{r.nombre}</span>
                    {!r.activo && <span className={styles.badgeInactiva}>Inactiva</span>}
                  </div>
                  {r.descuento > 0 ? (
                    <span className={styles.descuentoBadge}>{formatPorcentaje(r.descuento)} de descuento</span>
                  ) : (
                    <span className={styles.sinDescuento}>Sin descuento</span>
                  )}
                  <div className={styles.chips} aria-label={`Puntos de venta de ${r.nombre}`}>
                    {r.sucursales.map((s) => (
                      <span key={s.id} className={styles.chip}>
                        {s.nombre}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.filaAcciones}>
                  <button
                    type="button"
                    className={styles.btnLink}
                    onClick={() => abrirEdicion(r)}
                    disabled={guardando || eliminando}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    Editar
                  </button>
                  {r.activo && (
                    <button
                      type="button"
                      className={styles.btnLinkDanger}
                      onClick={() => setEliminarTarget(r)}
                      disabled={guardando || eliminando}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Dar de baja
                    </button>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {eliminarTarget && (
        <ConfirmActionModal
          title="Dar de baja región"
          description={`¿Estás seguro de que deseás dar de baja la región "${eliminarTarget.nombre}"? Los clientes mantendrán su historial pero no se ofrecerá para nuevas ventas.`}
          confirmLabel="Dar de baja"
          isConfirming={eliminando}
          onConfirm={confirmarEliminar}
          onClose={() => setEliminarTarget(null)}
        />
      )}
    </div>
  );
}
