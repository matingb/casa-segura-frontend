'use client';

import { useState } from 'react';
import { useClasificacion, notifyClasificacionChanged } from '../../../../lib/hooks/useClasificacion';
import { clasificacionClient } from '../../../../lib/api/clasificacion.client';
import { useToast } from '../../../../context/ToastContext';
import styles from './CategoriasConfiguracion.module.css';

export default function CategoriasConfiguracion() {
  const { tipos, subtipos, loading, refetch } = useClasificacion();
  const { showSuccess, showError } = useToast();

  // Estados de acordeón (categorías expandidas)
  const [expandedTipos, setExpandedTipos] = useState<Set<string>>(new Set());

  // Formulario de nueva categoría
  const [isAddingTipo, setIsAddingTipo] = useState(false);
  const [newTipoNombre, setNewTipoNombre] = useState('');
  const [isCreatingTipo, setIsCreatingTipo] = useState(false);

  // Formulario de nueva subcategoría (por ID de tipo)
  const [addingSubtipoForTipoId, setAddingSubtipoForTipoId] = useState<string | null>(null);
  const [newSubtipoNombre, setNewSubtipoNombre] = useState('');
  const [isCreatingSubtipo, setIsCreatingSubtipo] = useState(false);

  // Eliminación en progreso
  const [deletingTipoId, setDeletingTipoId] = useState<string | null>(null);
  const [deletingSubtipoId, setDeletingSubtipoId] = useState<string | null>(null);

  const toggleTipoExpanded = (tipoId: string) => {
    setExpandedTipos((prev) => {
      const next = new Set(prev);
      if (next.has(tipoId)) {
        next.delete(tipoId);
      } else {
        next.add(tipoId);
      }
      return next;
    });
  };

  // Crear categoría
  const handleCreateTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = newTipoNombre.trim();
    if (!nombre) return;

    setIsCreatingTipo(true);
    try {
      const created = await clasificacionClient.crearTipo(nombre);
      setNewTipoNombre('');
      setIsAddingTipo(false);
      // Auto-expandir la nueva categoría
      setExpandedTipos((prev) => new Set(prev).add(created.id));
      await refetch();
      notifyClasificacionChanged();
      showSuccess(`Categoría "${nombre}" creada con éxito.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la categoría';
      showError(msg);
    } finally {
      setIsCreatingTipo(false);
    }
  };

  // Eliminar categoría
  const handleDeleteTipo = async (tipoId: string, tipoNombre: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar la categoría "${tipoNombre}"? También se eliminarán todas sus subcategorías asociadas.`
    );
    if (!confirmed) return;

    setDeletingTipoId(tipoId);
    try {
      await clasificacionClient.eliminarTipo(tipoId);
      await refetch();
      notifyClasificacionChanged();
      showSuccess(`Categoría "${tipoNombre}" eliminada correctamente.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la categoría';
      showError(msg);
    } finally {
      setDeletingTipoId(null);
    }
  };

  // Crear subcategoría
  const handleCreateSubtipo = async (tipoId: string, e: React.FormEvent) => {
    e.preventDefault();
    const nombre = newSubtipoNombre.trim();
    if (!nombre) return;

    setIsCreatingSubtipo(true);
    try {
      await clasificacionClient.crearSubtipo(tipoId, nombre);
      setNewSubtipoNombre('');
      setAddingSubtipoForTipoId(null);
      await refetch();
      notifyClasificacionChanged();
      showSuccess(`Subcategoría "${nombre}" agregada correctamente.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la subcategoría';
      showError(msg);
    } finally {
      setIsCreatingSubtipo(false);
    }
  };

  // Eliminar subcategoría
  const handleDeleteSubtipo = async (subtipoId: string, subtipoNombre: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`¿Estás seguro de eliminar la subcategoría "${subtipoNombre}"?`);
    if (!confirmed) return;

    setDeletingSubtipoId(subtipoId);
    try {
      await clasificacionClient.eliminarSubtipo(subtipoId);
      await refetch();
      notifyClasificacionChanged();
      showSuccess(`Subcategoría "${subtipoNombre}" eliminada.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la subcategoría';
      showError(msg);
    } finally {
      setDeletingSubtipoId(null);
    }
  };

  return (
    <div className={styles.container}>
      {/* Barra superior de acciones */}
      <div className={styles.headerToolbar}>
        <div className={styles.toolbarInfo}>
          <h2 className={styles.toolbarTitle}>Categorías y Subcategorías</h2>
          <p className={styles.toolbarDescription}>
            Organiza los productos de tu inventario definiendo categorías generales y sus subítems correspondientes.
          </p>
        </div>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => setIsAddingTipo(true)}
          disabled={isAddingTipo}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nueva categoría</span>
        </button>
      </div>

      {/* Formulario de creación de categoría */}
      {isAddingTipo && (
        <div className={styles.newCategoryCard}>
          <form className={styles.newCategoryForm} onSubmit={handleCreateTipo}>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Nombre de la categoría (ej. Seguridad, Herramientas...)"
              value={newTipoNombre}
              onChange={(e) => setNewTipoNombre(e.target.value)}
              autoFocus
              disabled={isCreatingTipo}
            />
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isCreatingTipo || !newTipoNombre.trim()}
            >
              {isCreatingTipo ? 'Creando...' : 'Crear categoría'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                setIsAddingTipo(false);
                setNewTipoNombre('');
              }}
              disabled={isCreatingTipo}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Estado de carga */}
      {loading && tipos.length === 0 ? (
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          <span>Cargando categorías...</span>
        </div>
      ) : tipos.length === 0 ? (
        /* Estado vacío */
        <div className={styles.emptyState}>
          <div className={styles.categoryIconWrapper}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className={styles.emptyStateTitle}>No hay categorías registradas</p>
          <p>Comienza agregando tu primera categoría con el botón de arriba.</p>
        </div>
      ) : (
        /* Lista de categorías desplegables */
        <div className={styles.categoriesList}>
          {tipos.map((tipo) => {
            const isExpanded = expandedTipos.has(tipo.id);
            const tipoSubtipos = subtipos.filter((s) => s.tipoId === tipo.id);
            const isDeletingThis = deletingTipoId === tipo.id;

            return (
              <div key={tipo.id} className={styles.categoryCard}>
                {/* Encabezado de la categoría */}
                <div
                  className={styles.categoryHeader}
                  onClick={() => toggleTipoExpanded(tipo.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleTipoExpanded(tipo.id);
                    }
                  }}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.categoryHeaderLeft}>
                    <svg
                      className={`${styles.chevronIcon} ${isExpanded ? styles.chevronOpen : ''}`}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <div className={styles.categoryIconWrapper}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className={styles.categoryTitleGroup}>
                      <span className={styles.categoryTitle}>{tipo.nombre}</span>
                      <span className={styles.subCountBadge}>
                        {tipoSubtipos.length === 1
                          ? '1 subcategoría'
                          : `${tipoSubtipos.length} subcategorías`}
                      </span>
                    </div>
                  </div>

                  <div className={styles.categoryHeaderRight}>
                    {/* Botón para abrir formulario de subcategoría */}
                    <button
                      type="button"
                      className={styles.addSubBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Abrir acordeón si estaba cerrado
                        if (!isExpanded) toggleTipoExpanded(tipo.id);
                        setAddingSubtipoForTipoId(tipo.id);
                        setNewSubtipoNombre('');
                      }}
                      title={`Agregar subcategoría a ${tipo.nombre}`}
                      aria-label={`Agregar subcategoría a ${tipo.nombre}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Subcategoría</span>
                    </button>

                    {/* Botón eliminar categoría */}
                    <button
                      type="button"
                      className={styles.btnDangerIcon}
                      onClick={(e) => handleDeleteTipo(tipo.id, tipo.nombre, e)}
                      disabled={isDeletingThis}
                      title={`Eliminar categoría "${tipo.nombre}"`}
                      aria-label={`Eliminar categoría ${tipo.nombre}`}
                    >
                      {isDeletingThis ? (
                        <span className={styles.spinner} style={{ width: 14, height: 14, borderWidth: 2 }} />
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Panel de subcategorías desplegado */}
                {isExpanded && (
                  <div className={styles.subcategoriesPanel}>
                    {tipoSubtipos.length === 0 ? (
                      <div className={styles.emptySubs}>No hay subcategorías en esta categoría.</div>
                    ) : (
                      <div className={styles.subcategoriesList}>
                        {tipoSubtipos.map((subtipo) => {
                          const isDeletingSub = deletingSubtipoId === subtipo.id;
                          return (
                            <div key={subtipo.id} className={styles.subcategoryRow}>
                              <div className={styles.subLeft}>
                                <span className={styles.subBullet} />
                                <span className={styles.subName}>{subtipo.nombre}</span>
                              </div>
                              <button
                                type="button"
                                className={styles.btnDangerIcon}
                                onClick={(e) => handleDeleteSubtipo(subtipo.id, subtipo.nombre, e)}
                                disabled={isDeletingSub}
                                title={`Eliminar subcategoría "${subtipo.nombre}"`}
                                aria-label={`Eliminar subcategoría ${subtipo.nombre}`}
                              >
                                {isDeletingSub ? (
                                  <span className={styles.spinner} style={{ width: 12, height: 12, borderWidth: 2 }} />
                                ) : (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Formulario para agregar subcategoría */}
                    {addingSubtipoForTipoId === tipo.id ? (
                      <form
                        className={styles.newSubForm}
                        onSubmit={(e) => handleCreateSubtipo(tipo.id, e)}
                      >
                        <input
                          type="text"
                          className={styles.subInput}
                          placeholder="Nombre de la subcategoría..."
                          value={newSubtipoNombre}
                          onChange={(e) => setNewSubtipoNombre(e.target.value)}
                          autoFocus
                          disabled={isCreatingSubtipo}
                        />
                        <button
                          type="submit"
                          className={styles.btnPrimary}
                          disabled={isCreatingSubtipo || !newSubtipoNombre.trim()}
                          style={{ padding: '0.45rem 0.85rem' }}
                        >
                          {isCreatingSubtipo ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onClick={() => {
                            setAddingSubtipoForTipoId(null);
                            setNewSubtipoNombre('');
                          }}
                          disabled={isCreatingSubtipo}
                          style={{ padding: '0.45rem 0.75rem' }}
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
