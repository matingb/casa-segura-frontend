'use client';

import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OpcionesAsignacion, Sucursal, sucursalClient } from '../../../../lib/api/sucursal.client';
import { useSucursales } from '../../../../context/SucursalContext';
import { useToast } from '../../../../context/ToastContext';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { formatARS, formatPorcentaje } from '../../../../lib/utils/formatters';
import styles from './SucursalesConfiguracion.module.css';
import { useCotizacion } from '../../../../context/CotizacionContext';
import SucursalUsuariosEditor, { FilaAsignacion } from './SucursalUsuariosEditor';

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

const MOTIVO_NO_ASIGNADO = 'No estás asignado a esta sucursal, por eso no podés modificarla.';

interface SucursalesConfiguracionProps {
  /** Avisa cada vez que se recarga el listado (lo usa el contador de la pestaña). */
  onSucursalesCargadas?: (sucursales: Sucursal[]) => void;
  /** Lleva a la pestaña donde se configura el dólar de toda la empresa. */
  onIrACotizacion?: () => void;
}

export default function SucursalesConfiguracion({ onSucursalesCargadas, onIrACotizacion }: SucursalesConfiguracionProps) {
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

  const [opcionesAsignacion, setOpcionesAsignacion] = useState<OpcionesAsignacion | null>(null);
  const [asignaciones, setAsignaciones] = useState<FilaAsignacion[]>([]);
  const [cargandoAsignaciones, setCargandoAsignaciones] = useState(false);
  // Descarta respuestas de una edición que ya se cerró o cambió de sucursal.
  const pedidoAsignaciones = useRef(0);

  const [bajaTarget, setBajaTarget] = useState<Sucursal | null>(null);
  const [usoBaja, setUsoBaja] = useState<{ productosConStock: number; usuarios: number } | null>(null);
  const [dandoBaja, setDandoBaja] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await sucursalClient.obtenerParaAdmin();
      setSucursales(lista);
      onSucursalesCargadas?.(lista);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  }, [showError, onSucursalesCargadas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    sucursalClient
      .obtenerOpcionesAsignacion()
      .then(setOpcionesAsignacion)
      .catch((err) => showError(err instanceof Error ? err.message : 'Error al cargar los usuarios'));
  }, [showError]);

  const abrirCreacion = () => {
    pedidoAsignaciones.current++;
    setEditandoId(null);
    setForm(FORM_VACIO);
    setAsignaciones([]);
    setCargandoAsignaciones(false);
    setCreando(true);
  };

  const abrirEdicion = async (s: Sucursal) => {
    setCreando(false);
    setEditandoId(s.id);
    setForm(aFormState(s));
    setAsignaciones([]);
    setCargandoAsignaciones(true);
    const pedido = ++pedidoAsignaciones.current;
    try {
      const actuales = await sucursalClient.obtenerUsuarios(s.id);
      if (pedido !== pedidoAsignaciones.current) return;
      setAsignaciones(actuales.map(({ usuarioId, nombre, email, rolId, esActual }) => ({ usuarioId, nombre, email, rolId, esActual })));
      setCargandoAsignaciones(false);
    } catch (err) {
      if (pedido !== pedidoAsignaciones.current) return;
      showError(err instanceof Error ? err.message : 'Error al cargar los usuarios de la sucursal');
      cerrarForm();
    }
  };

  const cerrarForm = () => {
    pedidoAsignaciones.current++;
    setCreando(false);
    setEditandoId(null);
    setForm(FORM_VACIO);
    setAsignaciones([]);
    setCargandoAsignaciones(false);
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
      // Solo un administrador manda la lista; al crear, el backend suma a quien crea.
      ...(opcionesAsignacion?.puedeAdministrar
        ? { usuarios: asignaciones.map((a) => ({ usuario_id: a.usuarioId, id_rol: a.rolId })) }
        : {}),
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
          <span className={styles.fieldLabel}>Valor del dólar</span>
          <input
            type="number"
            min="0"
            step="0.01"
            // Con dólar de empresa se muestra ese valor (solo lectura); al guardar no se envía.
            value={usaCentral ? String(Number(cotizacion!.cotizacion_usd_ars)) : form.valorDolar}
            onChange={(e) => setForm({ ...form, valorDolar: e.target.value })}
            placeholder={usaCentral ? undefined : 'Ej: 1200'}
            disabled={guardando || usaCentral}
          />
          {usaCentral && (
            <span className={styles.hint}>
              El dólar se configura para toda la empresa
              {onIrACotizacion ? (
                <>
                  {' en '}
                  <button type="button" className={`${styles.btnLink} ${styles.hintLink}`} onClick={onIrACotizacion}>
                    Configuración → Cotización
                  </button>
                </>
              ) : (
                ' en Configuración → Cotización'
              )}
              .
            </span>
          )}
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

      <SucursalUsuariosEditor
        opciones={opcionesAsignacion}
        asignaciones={asignaciones}
        onChange={setAsignaciones}
        creando={creando}
        cargando={cargandoAsignaciones}
        disabled={guardando}
      />

      <div className={styles.formActions}>
        <button type="button" className={styles.btnSecondary} onClick={cerrarForm} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className={styles.btnPrimary} onClick={guardar} disabled={guardando || cargandoAsignaciones || !opcionesAsignacion}>
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
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={abrirCreacion}
          disabled={creando || !opcionesAsignacion?.puedeAdministrar}
          title={opcionesAsignacion && !opcionesAsignacion.puedeAdministrar ? 'Solo un administrador puede crear sucursales.' : undefined}
        >
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
                  <button
                    type="button"
                    className={styles.btnIcon}
                    onClick={() => abrirEdicion(s)}
                    disabled={!s.asignado}
                    title={!s.asignado ? MOTIVO_NO_ASIGNADO : `Editar ${s.nombre}`}
                    aria-label={`Editar ${s.nombre}`}
                  >
                    <Pencil size={16} />
                  </button>
                  {s.activo ? (
                    <button
                      type="button"
                      className={styles.btnIconDanger}
                      onClick={() => pedirBaja(s)}
                      aria-label={`Dar de baja ${s.nombre}`}
                      disabled={s.esCentral || !s.asignado}
                      title={
                        !s.asignado
                          ? MOTIVO_NO_ASIGNADO
                          : s.esCentral
                          ? 'La casa central no se puede dar de baja'
                          : `Dar de baja ${s.nombre}`
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnIcon}
                      onClick={() => reactivar(s)}
                      disabled={!s.asignado}
                      title={!s.asignado ? MOTIVO_NO_ASIGNADO : `Reactivar ${s.nombre}`}
                      aria-label={`Reactivar ${s.nombre}`}
                    >
                      <RotateCcw size={16} />
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
