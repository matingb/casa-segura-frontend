'use client';

import { useState } from 'react';
import Modal from '../../../../../components/ui/Modal/Modal';
import Button from '../../../../../components/ui/Button/Button';
import { EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMN_KEYS } from '../../_lib/exportColumns';
import styles from './ExportExcelModal.module.css';

interface ExportExcelModalProps {
  onClose: () => void;
  onConfirm: (selectedKeys: string[]) => void;
}

export default function ExportExcelModal({ onClose, onConfirm }: ExportExcelModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(DEFAULT_EXPORT_COLUMN_KEYS));

  const toggle = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedKeys(new Set(EXPORT_COLUMNS.map((c) => c.key)));
  const selectNone = () => setSelectedKeys(new Set());

  return (
    <Modal
      title="Exportar a Excel"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm(Array.from(selectedKeys))}
            disabled={selectedKeys.size === 0}
          >
            Exportar
          </Button>
        </>
      }
    >
      <div className={styles.actionsRow}>
        <button type="button" className={styles.linkButton} onClick={selectAll}>
          Seleccionar todas
        </button>
        <button type="button" className={styles.linkButton} onClick={selectNone}>
          Deseleccionar todas
        </button>
      </div>

      <div className={styles.columnsList}>
        {EXPORT_COLUMNS.map((column) => (
          <label key={column.key} className={styles.columnItem}>
            <input
              type="checkbox"
              checked={selectedKeys.has(column.key)}
              onChange={() => toggle(column.key)}
            />
            {column.label}
          </label>
        ))}
      </div>
    </Modal>
  );
}
