'use client';

import { ReactNode, useMemo, useState } from 'react';
import Modal from '../ui/Modal/Modal';
import Button from '../ui/Button/Button';
import styles from './ExportarColumnasModal.module.css';

export interface ColumnaExportable {
  key: string;
  label: string;
  /** Título de la sección en la que se agrupa la columna. */
  grupo?: string;
  /** Siempre se incluye: se muestra tildada y no se puede destildar. */
  obligatoria?: boolean;
  /** Si tiene texto, la columna no se puede elegir y se explica por qué. */
  noDisponible?: string;
}

interface Props {
  title: string;
  columnas: ColumnaExportable[];
  seleccionInicial: string[];
  /** Si se indica, aparece "Restablecer selección" para volver a estos valores. */
  seleccionPorDefecto?: string[];
  /** Texto arriba de los botones, calculado con la cantidad de columnas elegidas. */
  resumen?: (cantidadColumnas: number) => ReactNode;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (selectedKeys: string[]) => void;
}

const TOOLTIP_OBLIGATORIA = 'Esta columna siempre se incluye';

export default function ExportarColumnasModal({
  title, columnas, seleccionInicial, seleccionPorDefecto, resumen, confirmLabel = 'Exportar', onClose, onConfirm,
}: Props) {
  const normalizar = (keys: Iterable<string>) => {
    const elegibles = new Set(columnas.filter(c => !c.noDisponible).map(c => c.key));
    const set = new Set([...keys].filter(k => elegibles.has(k)));
    columnas.filter(c => c.obligatoria).forEach(c => set.add(c.key));
    return set;
  };
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => normalizar(seleccionInicial));

  const toggle = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return normalizar(next);
    });
  };

  const selectAll = () => setSelectedKeys(normalizar(columnas.map((c) => c.key)));
  const selectNone = () => setSelectedKeys(normalizar([]));

  const grupos = useMemo(() => {
    const mapa = new Map<string, ColumnaExportable[]>();
    for (const c of columnas) mapa.set(c.grupo ?? '', [...(mapa.get(c.grupo ?? '') ?? []), c]);
    return [...mapa.entries()];
  }, [columnas]);

  // Respeta el orden de definición de las columnas, no el orden en que se tildaron.
  const seleccionOrdenada = columnas.filter(c => selectedKeys.has(c.key)).map(c => c.key);

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          {resumen && <p className={styles.resumen} aria-live="polite">{resumen(seleccionOrdenada.length)}</p>}
          <div className={styles.footerBotones}>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => onConfirm(seleccionOrdenada)} disabled={seleccionOrdenada.length === 0}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.actionsRow}>
        <button type="button" className={styles.linkButton} onClick={selectAll}>
          Seleccionar todas
        </button>
        <button type="button" className={styles.linkButton} onClick={selectNone}>
          Deseleccionar todas
        </button>
        {seleccionPorDefecto && (
          <button type="button" className={styles.linkButton} onClick={() => setSelectedKeys(normalizar(seleccionPorDefecto))}>
            Restablecer selección
          </button>
        )}
      </div>

      {grupos.map(([grupo, cols]) => (
        <fieldset key={grupo || 'columnas'} className={styles.grupo}>
          {grupo && <legend className={styles.grupoTitulo}>{grupo}</legend>}
          <div className={styles.columnsList}>
            {cols.map((column) => {
              const bloqueada = column.obligatoria || Boolean(column.noDisponible);
              const ayuda = column.obligatoria ? TOOLTIP_OBLIGATORIA : column.noDisponible;
              return (
                <label key={column.key} className={`${styles.columnItem} ${bloqueada ? styles.columnItemBloqueada : ''}`} title={ayuda}>
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(column.key)}
                    onChange={() => toggle(column.key)}
                    disabled={bloqueada}
                  />
                  <span>
                    {column.label}
                    {column.noDisponible && <span className={styles.ayuda}>{column.noDisponible}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </Modal>
  );
}
