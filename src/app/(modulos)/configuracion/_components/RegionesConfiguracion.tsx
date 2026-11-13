'use client';

import { Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Region, regionClient } from '../../../../lib/api/region.client';
import { useToast } from '../../../../context/ToastContext';
import { useSucursales } from '../../../../context/SucursalContext';
import ConfirmActionModal from '../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import Combobox from '../../../../components/ui/Combobox/Combobox';
import DescuentoEtiqueta from './DescuentoEtiqueta';
import styles from './RegionesConfiguracion.module.css';

interface FormState {
  nombre: string;
  descuento: string;
  sucursalIds: string[];
}

const FORM_VACIO: FormState = { nombre: '', descuento: '', sucursalIds: [] };

interface RegionesConfiguracionProps {
  /** Avisa cada vez que se recarga el listado (lo usa el contador de la pestaña). */
  onRegionesCargadas?: (regiones: Region[]) => void;
}

export default function RegionesConfiguracion({ onRegionesCargadas }: RegionesConfiguracionProps) {
  const { showSuccess, showError } = useToast();
  const { sucursales, isLoading: cargandoSucursales } = useSucursales();

  const [regiones, setRegiones] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const request = useRef(0);

  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const descuentoInput = useRef<HTMLInputElement>(null);

  const [eliminarTarget, setEliminarTarget] = useState<Region | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setRegiones([]);
    try {
      const lista = await regionClient.obtenerTodas();
      if (version !== request.current) return;
      setRegiones(lista);
      onRegionesCargadas?.(lista);
    } catch (err) {
      if (version !== request.current) return;
      setRegiones([]);
      onRegionesCargadas?.([]);
      showError(err instanceof Error ? err.message : 'Error al cargar regiones');
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [showError, onRegionesCargadas]);

  useEffect(() => {
    const recargar = () => { void cargar(); };
    recargar();
    window.addEventListener('focus', recargar);
    window.addEventListener('alcance-pdv-revocado', recargar);
    return () => {
      request.current++;
      window.removeEventListener('focus', recargar);
      window.removeEventListener('alcance-pdv-revocado', recargar);
    };
  }, [cargar]);

  const abrirCreacion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setCreando(true);
  };

  const abrirEdicion = (r: Region) => {
    if (!r.puedeModificar) return;
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
    if (descuentoInput.current?.validity.badInput || !Number.isFinite(descuento) || descuento < 0 || descuento > 100) {
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
    if (!eliminarTarget || !eliminarTarget.puedeModificar) return;
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
          <span className={styles.fieldLabel}>Descuento (%)</span>
          <input
            ref={descuentoInput}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.descuento}
            onChange={(e) => setForm((prev) => ({ ...prev, descuento: e.target.value }))}
            placeholder="0"
          />
          <span className={styles.hint}>Si lo dejás vacío, se guarda 0%. Se aplica sobre el saldo tras descuentos de producto.</span>
        </label>
      </div>

      <div className={styles.puntosVenta}>
        <span className={styles.fieldLabel}>
          Puntos de venta<span className={styles.required}>*</span>
        </span>
        {(() => {
          // Un punto de venta dado de baja que ya estaba en la región se sigue mostrando.
          const opciones = [
            ...sucursales.filter((s) => s.activo).map((s) => ({ id: s.id, nombre: s.nombre })),
            ...regiones
              .flatMap((r) => (r.id === editandoId ? r.sucursales : []))
              .filter((s) => !sucursales.some((a) => a.id === s.id)),
          ];
          // Las etiquetas respetan el orden en que se fueron agregando.
          const seleccionados = form.sucursalIds
            .map((id) => opciones.find((o) => o.id === id))
            .filter((o): o is { id: string; nombre: string } => Boolean(o));
          // El desplegable solo ofrece lo que todavía no está elegido.
          const disponibles = opciones
            .filter((o) => !form.sucursalIds.includes(o.id))
            .map((o) => ({ value: o.id, label: o.nombre }));
          return (
            <div className={styles.puntosVentaPicker}>
              <Combobox
                label="Agregar punto de venta"
                options={disponibles}
                value=""
                onChange={(val) => {
                  if (val) setForm((prev) => ({ ...prev, sucursalIds: [...prev.sucursalIds, val] }));
                }}
                placeholder={
                  opciones.length > 0 && disponibles.length === 0
                    ? 'Todos los puntos de venta agregados'
                    : 'Seleccionar punto de venta'
                }
                disabled={guardando || disponibles.length === 0}
                loading={cargandoSucursales || opciones.length === 0}
              />
              {seleccionados.length > 0 && (
                <div className={styles.chipsSeleccion}>
                  {seleccionados.map((o) => (
                    <span key={o.id} className={styles.chipSeleccion}>
                      {o.nombre}
                      <button
                        type="button"
                        aria-label={`Quitar ${o.nombre}`}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, sucursalIds: prev.sucursalIds.filter((id) => id !== o.id) }))
                        }
                        disabled={guardando}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        <span className={styles.hint}>Una región puede agrupar uno o más puntos de venta.</span>
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
                    <DescuentoEtiqueta descuento={r.descuento} />
                    {!r.activo && <span className={styles.badgeInactiva}>Inactiva</span>}
                    {!r.puedeModificar && <span className={styles.badgeCompartida}>Incluye puntos fuera de tu alcance</span>}
                  </div>
                  <div className={styles.chips}>
                    <span className={styles.chipsLabel}>{r.sucursales.length === 1 ? 'Punto de venta:' : 'Puntos de venta:'}</span>
                    {r.sucursales.map((s) => (
                      <span key={s.id} className={styles.chip}>
                        {s.nombre}
                      </span>
                    ))}
                  </div>
                  {!r.puedeModificar && <p className={styles.avisoCompartida}>Podés usar esta región en clientes de tus puntos de venta, pero su configuración pertenece a varios puntos.</p>}
                </div>

                <div className={styles.filaAcciones}>
                  {r.puedeModificar && <button
                    type="button"
                    className={styles.btnIcon}
                    onClick={() => abrirEdicion(r)}
                    disabled={guardando || eliminando}
                    title={`Editar ${r.nombre}`}
                    aria-label={`Editar ${r.nombre}`}
                  >
                    <Pencil size={16} />
                  </button>}
                  {r.activo && r.puedeModificar && (
                    <button
                      type="button"
                      className={styles.btnIconDanger}
                      onClick={() => setEliminarTarget(r)}
                      disabled={guardando || eliminando}
                      title={`Dar de baja ${r.nombre}`}
                      aria-label={`Dar de baja ${r.nombre}`}
                    >
                      <Trash2 size={16} />
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
