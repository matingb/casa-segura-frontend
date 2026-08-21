'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Combobox, { ComboboxOption } from '../Combobox/Combobox';
import styles from './FilterBar.module.css';

export interface FilterField {
  key: string;
  label: string;
  type?: 'text' | 'select';
  /** Opciones fijas para un select (ej. un catálogo aparte). Si no se pasa, se usan las de `filterOptions[key]`. */
  options?: ComboboxOption[];
  /** Placeholder del select cuando no hay valor elegido. Default: "Todos". */
  placeholder?: string;
  /**
   * Campo obligatorio: siempre tiene un valor elegido. No genera chip removible
   * ni se borra con "Limpiar filtros" (ej. la sucursal en Lista de Precios).
   */
  required?: boolean;
}

interface FilterBarProps {
  fields: FilterField[];
  filters: Record<string, string>;
  onFilterChange: (columnKey: string, value: string) => void;
  filterOptions?: Record<string, ComboboxOption[]>;
  loading?: boolean;
}

function TextFilterInput({
  fieldKey,
  label,
  value,
  onFilterChange,
}: {
  fieldKey: string;
  label: string;
  value: string;
  onFilterChange: (columnKey: string, value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className={styles.textFilterGroup}>
      <label>{label}</label>
      <div className={styles.textInputWrapper}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.textInput}
          placeholder={`Buscar ${label.toLowerCase()}...`}
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onFilterChange(fieldKey, next), 300);
          }}
        />
      </div>
    </div>
  );
}

export default function FilterBar({ fields, filters, onFilterChange, filterOptions, loading }: FilterBarProps) {
  const [open, setOpen] = useState(false);

  if (fields.length === 0) return null;

  const activeChips = fields
    .map((field) => {
      const value = filters[field.key] ?? '';
      if (!value || field.required) return null;
      const label =
        field.options?.find((o) => o.value === value)?.label ??
        filterOptions?.[field.key]?.find((o) => o.value === value)?.label ??
        value;
      return { field, value, label };
    })
    .filter((entry): entry is { field: FilterField; value: string; label: string } => entry !== null);

  const clearAll = () => {
    activeChips.forEach((entry) => onFilterChange(entry.field.key, ''));
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <button
          type="button"
          className={`${styles.toggleButton} ${open ? styles.toggleButtonActive : ''}`}
          onClick={() => setOpen((o) => !o)}
        >
          <SlidersHorizontal size={15} />
          Filtros
          {activeChips.length > 0 && <span className={styles.countBadge}>{activeChips.length}</span>}
        </button>

        {activeChips.length > 0 && (
          <div className={styles.chips}>
            {activeChips.map(({ field, label }) => (
              <span key={field.key} className={styles.chip}>
                {field.label}: {label}
                <button
                  type="button"
                  aria-label={`Quitar filtro ${field.label}`}
                  onClick={() => onFilterChange(field.key, '')}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button type="button" className={styles.clearAllButton} onClick={clearAll}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className={styles.panel}>
          {fields.map((field) =>
            field.type === 'text' ? (
              <TextFilterInput
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                value={filters[field.key] ?? ''}
                onFilterChange={onFilterChange}
              />
            ) : (
              <div key={field.key} className={styles.filterField}>
                <Combobox
                  label={field.label}
                  options={[
                    ...(field.required ? [] : [{ value: '', label: field.placeholder ?? 'Todos' }]),
                    ...(field.options ?? filterOptions?.[field.key] ?? []),
                  ]}
                  value={filters[field.key] ?? ''}
                  onChange={(value) => onFilterChange(field.key, value)}
                  placeholder={field.placeholder ?? 'Todos'}
                  loading={loading}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
