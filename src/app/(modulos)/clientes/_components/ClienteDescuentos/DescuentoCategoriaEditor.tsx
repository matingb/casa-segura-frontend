'use client';

import { useState } from 'react';
import { ClienteDescuentoCategoria } from '../../../../../lib/types/Region';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import styles from './ClienteDescuentos.module.css';

interface Props {
  clienteId: string;
  categorias: ClienteDescuentoCategoria[];
  onChanged: () => void;
}

export default function DescuentoCategoriaEditor({
  clienteId,
  categorias,
  onChanged,
}: Props) {
  const { showSuccess, showError } = useToast();
  const { tipos, subtipos, getSubtiposPorTipo } = useClasificacion();

  const [modo, setModo] = useState<'tipo' | 'subtipo'>('tipo');
  const [selectedTipoId, setSelectedTipoId] = useState<string>('');
  const [selectedSubtipoId, setSelectedSubtipoId] = useState<string>('');
  const [porcentaje, setPorcentaje] = useState<string>('');
  const [nota, setNota] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subtiposDisponibles = selectedTipoId ? getSubtiposPorTipo(selectedTipoId) : subtipos;

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === 'tipo' && !selectedTipoId) {
      showError('Seleccioná una categoría.');
      return;
    }
    if (modo === 'subtipo' && !selectedSubtipoId) {
      showError('Seleccioná una subcategoría.');
      return;
    }

    const p = Number(porcentaje);
    if (!Number.isFinite(p) || p <= 0 || p > 100) {
      showError('Ingresá un porcentaje válido entre 0.01 y 100.');
      return;
    }

    setSaving(true);
    try {
      await clienteDescuentoClient.asignarCategoria(clienteId, {
        tipo_id: modo === 'tipo' ? selectedTipoId : undefined,
        subtipo_id: modo === 'subtipo' ? selectedSubtipoId : undefined,
        porcentaje: p,
        nota: nota.trim() || undefined,
      });
      showSuccess('Descuento asignado correctamente.');
      setPorcentaje('');
      setNota('');
      setSelectedTipoId('');
      setSelectedSubtipoId('');
      onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al guardar descuento.');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: string) => {
    setDeletingId(id);
    try {
      await clienteDescuentoClient.quitarCategoria(clienteId, id);
      showSuccess('Descuento eliminado.');
      onChanged();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al eliminar descuento.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Formulario de agregar */}
      <form onSubmit={handleAgregar} className={styles.addForm}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.85rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="catModo"
              checked={modo === 'tipo'}
              onChange={() => {
                setModo('tipo');
                setSelectedSubtipoId('');
              }}
            />
            Por Categoría general
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="catModo"
              checked={modo === 'subtipo'}
              onChange={() => setModo('subtipo')}
            />
            Por Subcategoría específica
          </label>
        </div>

        <div className={styles.addFormGrid}>
          {modo === 'tipo' ? (
            <div className={`${styles.field} ${styles.fieldCategoria}`}>
              <label className={styles.fieldLabel}>Categoría</label>
              <select
                className={styles.select}
                value={selectedTipoId}
                onChange={(e) => setSelectedTipoId(e.target.value)}
              >
                <option value="">Seleccionar categoría...</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className={`${styles.field} ${styles.fieldCategoria}`}>
                <label className={styles.fieldLabel}>Filtrar por categoría (opcional)</label>
                <select
                  className={styles.select}
                  value={selectedTipoId}
                  onChange={(e) => {
                    setSelectedTipoId(e.target.value);
                    setSelectedSubtipoId('');
                  }}
                >
                  <option value="">Todas las categorías</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`${styles.field} ${styles.fieldCategoria}`}>
                <label className={styles.fieldLabel}>Subcategoría</label>
                <select
                  className={styles.select}
                  value={selectedSubtipoId}
                  onChange={(e) => setSelectedSubtipoId(e.target.value)}
                >
                  <option value="">Seleccionar subcategoría...</option>
                  {subtiposDisponibles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={`${styles.field} ${styles.fieldDescuento}`}>
            <label className={styles.fieldLabel}>Descuento (%)</label>
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              className={styles.input}
              placeholder="Ej: 10"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldNota}`}>
            <label className={styles.fieldLabel}>Nota / Motivo (opcional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ej: Descuento especial instalador"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div className={styles.fieldAction}>
            <button type="submit" className={styles.btnAction} disabled={saving}>
              + Asignar
            </button>
          </div>
        </div>
      </form>

      {/* Lista de asignaciones */}
      {categorias.length === 0 ? (
        <div className={styles.emptyBlock}>
          No hay descuentos de categoría asignados a este cliente.
        </div>
      ) : (
        <div className={styles.itemsList}>
          {categorias.map((c) => {
            const esSubtipo = Boolean(c.subtipoId);
            return (
              <div key={c.id} className={styles.itemCard}>
                <div className={styles.itemInfo}>
                  <div>
                    <span className={styles.itemName}>
                      {esSubtipo ? c.subtipoNombre : c.tipoNombre}
                    </span>
                    <span className={styles.itemSub} style={{ display: 'block' }}>
                      {esSubtipo
                        ? `Subcategoría de: ${c.categoriaPadreNombre ?? 'Categoría'}`
                        : 'Categoría completa'}
                    </span>
                    {c.nota && <span className={styles.itemNote}>"{c.nota}"</span>}
                  </div>

                  <span className={styles.discountBadge}>
                    -{formatPorcentaje(c.porcentaje)}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    className={styles.btnDangerOutline}
                    onClick={() => handleEliminar(c.id)}
                    disabled={deletingId === c.id}
                  >
                    {deletingId === c.id ? 'Quitando...' : 'Quitar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
