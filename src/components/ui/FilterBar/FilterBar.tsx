'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Combobox, { ComboboxOption } from '../Combobox/Combobox';
import styles from './FilterBar.module.css';

export interface FilterField {
  key: string;
  label: string;
  type?: 'text' | 'select';
  options?: ComboboxOption[];
  placeholder?: string;
  required?: boolean;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  fields: FilterField[];
  filters: Record<string, string>;
  onFilterChange: (columnKey: string, value: string) => void;
  filterOptions?: Record<string, ComboboxOption[]>;
  loading?: boolean;
}

function useDebouncedDraft(value: string, onChange: (val: string) => void, delay = 300) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), delay);
  };

  const handleClear = () => {
    setDraft('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange('');
  };

  return { draft, handleChange, handleClear };
}

function MainSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const { draft, handleChange, handleClear } = useDebouncedDraft(value, onChange);

  return (
    <div className={styles.searchWrapper}>
      <Search size={15} className={styles.searchIcon} />
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder ?? 'Buscar por código o nombre...'}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
      />
      {draft && (
        <button
          type="button"
          className={styles.clearSearchButton}
          onClick={handleClear}
          aria-label="Borrar búsqueda"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
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
  const { draft, handleChange } = useDebouncedDraft(value, (val) => onFilterChange(fieldKey, val));

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
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function FilterBar({
  search = '',
  onSearchChange,
  searchPlaceholder,
  fields,
  filters,
  onFilterChange,
  filterOptions,
  loading,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);

  if (fields.length === 0 && !onSearchChange) return null;

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
    if (onSearchChange && search) {
      onSearchChange('');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        {onSearchChange && (
          <MainSearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}

        {fields.length > 0 && (
          <button
            type="button"
            className={`${styles.toggleButton} ${open ? styles.toggleButtonActive : ''}`}
            onClick={() => setOpen((o) => !o)}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeChips.length > 0 && <span className={styles.countBadge}>{activeChips.length}</span>}
          </button>
        )}

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

      {open && fields.length > 0 && (
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
