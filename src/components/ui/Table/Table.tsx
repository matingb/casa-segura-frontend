import { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import styles from './Table.module.css';

export type SortDir = 'asc' | 'desc';

export type ColumnAlign = 'left' | 'right' | 'center';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: ColumnAlign;
  /** Ancho CSS de la columna (ej. "1%" para que se encoja al contenido). */
  width?: string;
}

export interface SortCriterion {
  sortBy: string;
  sortDir: SortDir;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  sort?: SortCriterion[];
  onSortChange?: (columnKey: string) => void;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
}

export default function Table<T>({
  columns,
  data,
  getRowKey,
  emptyMessage = 'No hay datos para mostrar.',
  sort,
  onSortChange,
  onRowClick,
  stickyHeader,
}: TableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={stickyHeader ? styles.stickyHead : undefined}>
          <tr>
            {columns.map((column) => {
              const alignClass = column.align === 'right' ? styles.alignRight : column.align === 'center' ? styles.alignCenter : undefined;
              if (!column.sortable || !onSortChange) {
                return (
                  <th key={column.key} className={alignClass} style={column.width ? { width: column.width } : undefined}>
                    {column.header}
                  </th>
                );
              }
              const sortIndex = sort?.findIndex((c) => c.sortBy === column.key) ?? -1;
              const criterion = sortIndex >= 0 ? sort![sortIndex] : undefined;
              const Icon = criterion ? (criterion.sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
              const showPriority = criterion && (sort?.length ?? 0) > 1;
              return (
                <th key={column.key} className={alignClass} style={column.width ? { width: column.width } : undefined}>
                  <button
                    type="button"
                    className={criterion ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                    onClick={() => onSortChange(column.key)}
                    title="Click para ordenar. Si ya hay otra columna ordenada, se suma como desempate."
                  >
                    {column.header}
                    <Icon size={13} />
                    {showPriority && <span className={styles.sortPriority}>{sortIndex + 1}</span>}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyText}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={getRowKey(row)}
                className={onRowClick ? styles.clickableRow : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => {
                  const alignClass = column.align === 'right' ? styles.alignRight : column.align === 'center' ? styles.alignCenter : undefined;
                  return (
                    <td key={column.key} className={alignClass}>
                      {column.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
