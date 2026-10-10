'use client';

import { useCallback, useEffect, useState } from 'react';
import { Region, regionClient } from '../../../../lib/api/region.client';
import { useSucursales } from '../../../../context/SucursalContext';
import { useToast } from '../../../../context/ToastContext';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import Select from '../../../../components/ui/Select/Select';
import { formatPorcentaje } from '../../../../lib/utils/formatters';
import styles from './RegionesConfiguracion.module.css';

interface FormState {
  nombre: string;
  descuento: string;
}

const FORM_VACIO: FormState = { nombre: '', descuento: '' };

export default function RegionesConfiguracion() {
  const { showSuccess, showError } = useToast();
  const { sucursales } = useSucursales();

  const [selectedSucursalId, setSelectedSucursalId] = useState<string>('');
  const [regiones, setRegiones] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);

  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [eliminarTarget, setEliminarTarget] = useState<Region | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // Inicializar sucursal seleccionada
  useEffect(() => {
    if (!selectedSucursalId && sucursales.length > 0) {
      const central = sucursales.find((s) => s.esCentral);
      setSelectedSucursalId(central?.id || sucursales[0].id);
    }
  }, [sucursales, selectedSucursalId]);

  const cargar = useCallback(
    async (sucId: string) => {
      if (!sucId) return;
      setLoading(true);
      try {
        const data = await regionClient.obtenerPorSucursal(sucId);
        setRegiones(data);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Error al cargar regiones');
      } finally {
        setLoading(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    if (selectedSucursalId) {
      cargar(selectedSucursalId);
      setCreando(false);
      setEditandoId(null);
      setForm(FORM_VACIO);
    }
  }, [selectedSucursalId, cargar]);

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
      descuento: r.descuento === 0 ? '0' : String(r.descuento),
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
    if (form.descuento.trim() === '' || !Number.isFinite(descuento) || descuento <= 0 || descuento > 100) {
      showError('El descuento debe ser mayor a 0% y como máximo 100%.');
      return;
    }

    setGuardando(true);
    try {
      if (editandoId) {
        await regionClient.actualizar(editandoId, { nombre, descuento });
        showSuccess('Región actualizada exitosamente.');
      } else {
        await regionClient.crear({
          sucursal_id: selectedSucursalId,
          nombre,
          descuento,
        });
        showSuccess('Región creada exitosamente.');
      }
      cerrarForm();
      await cargar(selectedSucursalId);
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
      await cargar(selectedSucursalId);
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
            min="0.01"
            max="100"
            step="0.01"
            value={form.descuento}
            onChange={(e) => setForm((prev) => ({ ...prev, descuento: e.target.value }))}
            placeholder="Ej: 5"
          />
          <span className={styles.hint}>% sobre el saldo tras descuentos de producto</span>
        </label>
      </div>

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
          <h2 className={styles.toolbarTitle}>Regiones por Punto de Venta</h2>
          <p className={styles.toolbarDescription}>
            Configurá las regiones geográficas y sus descuentos correspondientes para cada punto de venta.
          </p>
        </div>

        <div className={styles.toolbarActions}>
          <div className={styles.sucursalSelect}>
            <Select
              id="select-sucursal-regiones"
              label="Punto de venta"
              value={selectedSucursalId}
              onChange={(e) => setSelectedSucursalId(e.target.value)}
              disabled={sucursales.length === 0}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.esCentral ? `${s.nombre} (Casa central)` : s.nombre}
                </option>
              ))}
            </Select>
          </div>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={abrirCreacion}
            disabled={creando || loading || !selectedSucursalId}
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
          <p className={styles.emptyTitle}>No hay regiones configuradas para este punto de venta.</p>
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
                </div>

                <div className={styles.filaAcciones}>
                  <button
                    type="button"
                    className={styles.btnLink}
                    onClick={() => abrirEdicion(r)}
                    disabled={guardando || eliminando}
                  >
                    Editar
                  </button>
                  {r.activo && (
                    <button
                      type="button"
                      className={styles.btnLinkDanger}
                      onClick={() => setEliminarTarget(r)}
                      disabled={guardando || eliminando}
                    >
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
