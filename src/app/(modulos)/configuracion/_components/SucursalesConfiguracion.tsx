'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sucursal, sucursalClient } from '../../../../lib/api/sucursal.client';
import { useSucursales } from '../../../../context/SucursalContext';
import { useToast } from '../../../../context/ToastContext';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { formatARS, formatPorcentaje } from '../../../../lib/utils/formatters';
import styles from './SucursalesConfiguracion.module.css';
import { useCotizacion } from '../../../../context/CotizacionContext';

interface FormState {
  nombre: string;
  valorDolar: string;
  descuento: string;
  esCentral: boolean;
}

const FORM_VACIO: FormState = { nombre: '', valorDolar: '', descuento: '', esCentral: false };

function aFormState(s: Sucursal): FormState {
  return {
    nombre: s.nombre,
    valorDolar: s.valorDolar ? String(s.valorDolar) : '',
    descuento: s.descuento === null ? '' : String(s.descuento),
    esCentral: s.esCentral,
  };
}

export default function SucursalesConfiguracion() {
  const { showSuccess, showError } = useToast();
  const { recargarSucursales } = useSucursales();
  const { datos: cotizacion } = useCotizacion();
  const usaCentral = cotizacion?.cotizacion_usd_ars != null;

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);

  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [bajaTarget, setBajaTarget] = useState<Sucursal | null>(null);
  const [usoBaja, setUsoBaja] = useState<{ productosConStock: number; usuarios: number } | null>(null);
  const [dandoBaja, setDandoBaja] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setSucursales(await sucursalClient.obtenerParaAdmin());
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCreacion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setCreando(true);
  };

  const abrirEdicion = (s: Sucursal) => {
    setCreando(false);
    setEditandoId(s.id);
    setForm(aFormState(s));
  };

  const cerrarForm = () => {
    setCreando(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
  };

  const guardar = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      showError('El nombre de la sucursal es obligatorio.');
      return;
    }
    const valorDolar = form.valorDolar.trim() === '' ? null : Number(form.valorDolar);
    if (valorDolar !== null && (!Number.isFinite(valorDolar) || valorDolar < 0)) {
      showError('El valor del dólar debe ser un número positivo.');
      return;
    }
    const descuento = form.descuento.trim() === '' ? null : Number(form.descuento);
    if (descuento !== null && (!Number.isFinite(descuento) || descuento < 0 || descuento > 100)) {
      showError('El descuento debe ser un porcentaje entre 0 y 100.');
      return;
    }

    const body = {
      nombre,
      ...(!usaCentral ? { valor_dolar: valorDolar } : {}),
      descuento,
      es_central: form.esCentral,
    };

    setGuardando(true);
    try {
      if (editandoId) {
        await sucursalClient.actualizar(editandoId, body);
        showSuccess(`Sucursal "${nombre}" actualizada.`);
      } else {
        await sucursalClient.crear(body);
        showSuccess(`Sucursal "${nombre}" creada.`);
      }
      cerrarForm();
      await cargar();
      // El selector de sucursales del resto del sistema tiene que reflejarlo.
      await recargarSucursales();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo guardar la sucursal.');
    } finally {
      setGuardando(false);
    }
  };

  const pedirBaja = async (s: Sucursal) => {
    setBajaTarget(s);
    setUsoBaja(null);
    try {
      setUsoBaja(await sucursalClient.obtenerUso(s.id));
    } catch {
      // El resumen es informativo: si falla, el modal igual permite confirmar.
    }
  };

  const confirmarBaja = async () => {
    if (!bajaTarget) return;
    setDandoBaja(true);
    try {
      await sucursalClient.desactivar(bajaTarget.id);
      showSuccess(`Sucursal "${bajaTarget.nombre}" dada de baja.`);
      setBajaTarget(null);
      await cargar();
      await recargarSucursales();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo dar de baja la sucursal.');
    } finally {
      setDandoBaja(false);
    }
  };

  const reactivar = async (s: Sucursal) => {
    try {
      await sucursalClient.actualizar(s.id, { activo: true });
      showSuccess(`Sucursal "${s.nombre}" reactivada.`);
      await cargar();
      await recargarSucursales();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo reactivar la sucursal.');
    }
  };

  const formulario = (
    <div className={styles.formCard}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Nombre<span className={styles.required}>*</span>
          </span>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Sucursal Centro"
            disabled={guardando}
            autoFocus
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{usaCentral ? 'Dólar anterior de sucursal (solo lectura)' : 'Valor del dólar anterior de sucursal'}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.valorDolar}
            onChange={(e) => setForm({ ...form, valorDolar: e.target.value })}
            placeholder="Ej: 1200"
            disabled={guardando || usaCentral}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Descuento (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.descuento}
            onChange={(e) => setForm({ ...form, descuento: e.target.value })}
            placeholder="—"
            disabled={guardando}
          />
        </label>
      </div>

      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={form.esCentral}
          onChange={(e) => setForm({ ...form, esCentral: e.target.checked })}
          disabled={guardando}
        />
        Es la casa central
        <span className={styles.hint}>Solo puede haber una: se le quita a la que la tenga.</span>
      </label>

      <div className={styles.formActions}>
        <button type="button" className={styles.btnSecondary} onClick={cerrarForm} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className={styles.btnPrimary} onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerToolbar}>
        <div className={styles.toolbarInfo}>
          <h2 className={styles.toolbarTitle}>Sucursales</h2>
          <p className={styles.toolbarDescription}>
            Administra las sucursales y sus descuentos. La referencia del dólar se configura para toda la empresa.
          </p>
        </div>
        <button type="button" className={styles.btnPrimary} onClick={abrirCreacion} disabled={creando}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nueva sucursal</span>
        </button>
      </div>

      {creando && formulario}

      {loading && sucursales.length === 0 ? (
        <div className={styles.loadingState}>Cargando sucursales...</div>
      ) : sucursales.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No hay sucursales registradas</p>
          <p>Creá la primera con el botón de arriba.</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {sucursales.map((s) =>
            editandoId === s.id ? (
              <div key={s.id}>{formulario}</div>
            ) : (
              <div key={s.id} className={`${styles.fila} ${!s.activo ? styles.filaInactiva : ''}`}>
                <div className={styles.filaInfo}>
                  <div className={styles.filaNombre}>
                    <span className={styles.nombre}>{s.nombre}</span>
                    {s.esCentral && <span className={styles.badgeCentral}>Casa central</span>}
                    {!s.activo && <span className={styles.badgeInactiva}>Inactiva</span>}
                  </div>
                  <div className={styles.filaDatos}>
                    <span>Dólar anterior: {s.valorDolar ? formatARS(s.valorDolar) : '—'}</span>
                    <span>
                      Descuento: {s.descuento !== null ? formatPorcentaje(s.descuento) : '—'}
                    </span>
                  </div>
                </div>

                <div className={styles.filaAcciones}>
                  <button type="button" className={styles.btnLink} onClick={() => abrirEdicion(s)}>
                    Editar
                  </button>
                  {s.activo ? (
                    <button
                      type="button"
                      className={styles.btnLinkDanger}
                      onClick={() => pedirBaja(s)}
                      disabled={s.esCentral}
                      title={
                        s.esCentral
                          ? 'La casa central no se puede dar de baja'
                          : `Dar de baja ${s.nombre}`
                      }
                    >
                      Dar de baja
                    </button>
                  ) : (
                    <button type="button" className={styles.btnLink} onClick={() => reactivar(s)}>
                      Reactivar
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {bajaTarget && (
        <ConfirmActionModal
          title={`Dar de baja "${bajaTarget.nombre}"`}
          description={
            usoBaja
              ? `La sucursal deja de estar disponible para operar, pero conserva su stock e historial. Hoy tiene ${usoBaja.productosConStock} producto(s) con stock y ${usoBaja.usuarios} usuario(s) asignado(s). Podés reactivarla cuando quieras.`
              : 'La sucursal deja de estar disponible para operar, pero conserva su stock e historial. Podés reactivarla cuando quieras.'
          }
          confirmLabel="Dar de baja"
          isConfirming={dandoBaja}
          onConfirm={confirmarBaja}
          onClose={() => setBajaTarget(null)}
        />
      )}
    </div>
  );
}
