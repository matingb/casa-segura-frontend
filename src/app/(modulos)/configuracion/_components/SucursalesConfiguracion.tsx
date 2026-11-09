'use client';

import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OpcionesAsignacion, ReferenciaSucursalGlobal, Sucursal, sucursalClient } from '../../../../lib/api/sucursal.client';
import { useSucursales } from '../../../../context/SucursalContext';
import { useToast } from '../../../../context/ToastContext';
import BotonConMotivo from '../../../../components/ui/Button/BotonConMotivo';
import MarcaObligatoria from '../../../../components/ui/MarcaObligatoria/MarcaObligatoria';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { formatARS, formatPorcentaje } from '../../../../lib/utils/formatters';
import styles from './SucursalesConfiguracion.module.css';
import { useCotizacion } from '../../../../context/CotizacionContext';
import { CatalogoApiError } from '../../../../lib/api/cotizacion.client';
import { Dinero } from '../../../../lib/utils/precio';
import SucursalUsuariosEditor, { FilaAsignacion } from './SucursalUsuariosEditor';

interface FormState {
  nombre: string;
  valorDolar: string;
  usarCotizacionPropia: boolean;
  valorDolarVersion: string;
  descuento: string;
  esCentral: boolean;
}

const FORM_VACIO: FormState = { nombre: '', valorDolar: '', usarCotizacionPropia: false, valorDolarVersion: '0', descuento: '', esCentral: false };

function aFormState(s: Sucursal): FormState {
  return {
    nombre: s.nombre,
    valorDolar: s.valorDolar ?? '',
    usarCotizacionPropia: s.valorDolar !== null,
    valorDolarVersion: s.valorDolarVersion,
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
  const { datos: cotizacion, recargar: recargarCotizacion } = useCotizacion();

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [referenciasGlobales, setReferenciasGlobales] = useState<ReferenciaSucursalGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const requestListado = useRef(0);

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
    const version = ++requestListado.current;
    setLoading(true);
    setSucursales([]);
    setReferenciasGlobales([]);
    try {
      const [lista, referencias] = await Promise.all([
        sucursalClient.obtenerParaAdmin(),
        sucursalClient.obtenerReferenciasGlobales(),
      ]);
      if (version !== requestListado.current) return;
      setSucursales(lista);
      setReferenciasGlobales(referencias);
      onSucursalesCargadas?.(lista);
    } catch (err) {
      if (version !== requestListado.current) return;
      setSucursales([]);
      setReferenciasGlobales([]);
      onSucursalesCargadas?.([]);
      showError(err instanceof Error ? err.message : 'Error al cargar sucursales');
    } finally {
      if (version === requestListado.current) setLoading(false);
    }
  }, [showError, onSucursalesCargadas]);

  const casaCentralGlobal = referenciasGlobales.find((sucursal) => sucursal.esCentral) ?? null;

  useEffect(() => {
    const recargar = () => { void cargar(); };
    recargar();
    window.addEventListener('focus', recargar);
    window.addEventListener('alcance-pdv-revocado', recargar);
    return () => {
      requestListado.current++;
      window.removeEventListener('focus', recargar);
      window.removeEventListener('alcance-pdv-revocado', recargar);
    };
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
    const valorDolar = form.usarCotizacionPropia ? form.valorDolar.trim() : null;
    if (valorDolar !== null) {
      if (!/^\d+(?:\.\d+)?$/.test(valorDolar)) {
        showError('La cotización del PDV debe ser un decimal positivo con hasta 6 decimales.');
        return;
      }
      const tasa = new Dinero(valorDolar);
      if (!tasa.isFinite() || tasa.lte(0) || tasa.decimalPlaces() > 6 || tasa.gte('1000000000000')) {
        showError('La cotización del PDV debe ser positiva, menor a 1.000.000.000.000 y tener hasta 6 decimales.');
        return;
      }
    }
    const descuento = form.descuento.trim() === '' ? null : Number(form.descuento);
    if (descuento !== null && (!Number.isFinite(descuento) || descuento < 0 || descuento > 100)) {
      showError('El descuento debe ser un porcentaje entre 0 y 100.');
      return;
    }

    const body = {
      nombre,
      valor_dolar: valorDolar,
      ...(editandoId ? { valor_dolar_version_esperada: form.valorDolarVersion } : {}),
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
      if (err instanceof CatalogoApiError && err.code === 'COTIZACION_CAMBIO' && editandoId) {
        try {
          const actualizadas = await sucursalClient.obtenerParaAdmin();
          const actualizada = actualizadas.find((s) => s.id === editandoId);
          setSucursales(actualizadas);
          if (actualizada) setForm((prev) => ({ ...prev, valorDolarVersion: actualizada.valorDolarVersion }));
          await recargarCotizacion();
        } catch {
          // Se conserva el formulario para que el usuario pueda volver a consultar.
        }
        showError('La cotización cambió. Se conservó el borrador y se actualizó la versión; revisá el valor antes de guardar de nuevo.');
        return;
      }
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

      <div className={styles.cotizacionRow}>
        <label className={styles.cotizacionSwitch}>
          <input
            type="checkbox"
            role="switch"
            checked={form.usarCotizacionPropia}
            onChange={(e) => setForm({ ...form, usarCotizacionPropia: e.target.checked })}
            disabled={guardando}
          />
          <span>Cotización del PDV</span>
        </label>
        <label className={styles.field}>
          <span>Pesos argentinos por 1 USD{form.usarCotizacionPropia && <MarcaObligatoria />}</span>
          <input
            className={styles.cotizacionInput}
            type="number"
            min="0.000001"
            step="0.000001"
            value={form.usarCotizacionPropia ? form.valorDolar : (cotizacion?.cotizacion_usd_ars ?? '')}
            onChange={(e) => setForm({ ...form, valorDolar: e.target.value })}
            placeholder={form.usarCotizacionPropia ? 'Ej: 1200' : 'Sin configurar'}
            aria-required={form.usarCotizacionPropia || undefined}
            disabled={guardando || !form.usarCotizacionPropia}
          />
        </label>
        <span className={styles.hint}>
          {form.usarCotizacionPropia ? (
            <>
              Cotización general vigente: {cotizacion?.cotizacion_usd_ars != null ? `1 USD = ${formatARS(cotizacion.cotizacion_usd_ars)}` : 'sin configurar'}.
              La tasa efectiva de este PDV será la propia.
            </>
          ) : cotizacion?.cotizacion_usd_ars != null ? (
            <>La tasa efectiva de este PDV hereda la cotización general de la empresa.
              {onIrACotizacion && <button type="button" className={`${styles.btnLink} ${styles.hintLink}`} onClick={onIrACotizacion}> Configuración → Cotización</button>}
            </>
          ) : (
            <>La empresa todavía no tiene una cotización general configurada.
              {onIrACotizacion && <button type="button" className={`${styles.btnLink} ${styles.hintLink}`} onClick={onIrACotizacion}> Configuración → Cotización</button>}
            </>
          )}
        </span>
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
        <BotonConMotivo
          nativo
          type="button"
          className={styles.btnPrimary}
          onClick={guardar}
          disabled={guardando}
          motivo={cargandoAsignaciones
            ? 'Cargando las asignaciones de usuarios…'
            : !opcionesAsignacion ? 'Las opciones de asignación de usuarios no están disponibles.' : undefined}
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </BotonConMotivo>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerToolbar}>
        <div className={styles.toolbarInfo}>
          <h2 className={styles.toolbarTitle}>Sucursales</h2>
          <p className={styles.toolbarDescription}>
            Administra las sucursales, sus descuentos y la cotización propia o heredada de cada PDV.
          </p>
          <p className={styles.toolbarDescription}>
            Casa central actual: {casaCentralGlobal?.nombre ?? 'sin definir'}.
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
                    <span>{s.valorDolar !== null
                      ? `Efectiva: ${formatARS(s.valorDolar)} · propia del PDV`
                      : `Efectiva: ${cotizacion?.cotizacion_usd_ars != null ? formatARS(cotizacion.cotizacion_usd_ars) : 'sin configurar'} · general heredada`}</span>
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
