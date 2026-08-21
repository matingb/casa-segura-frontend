'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import IconButton from '../../../../../components/ui/IconButton/IconButton';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar, { FilterField } from '../../../../../components/ui/FilterBar/FilterBar';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import { Operacion } from '../../../../../lib/types/Operacion';
import { useOperacionesFiltrado } from '../../_hooks/useOperacionesFiltrado';
import { formatFecha, formatMonto } from '../../../../../lib/utils/formatters';
import NuevaOperacionModal from '../NuevaOperacionModal/NuevaOperacionModal';
import styles from './OperacionesCatalogo.module.css';

function getTipoVariant(tipoNombre: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const lower = tipoNombre.toLowerCase();
  if (lower.includes('venta') || lower.includes('ingreso')) return 'success';
  if (lower.includes('egreso') || lower.includes('gasto') || lower.includes('devolucion') || lower.includes('devolución')) return 'danger';
  if (lower.includes('ajuste') || lower.includes('transferencia')) return 'warning';
  return 'neutral';
}

export default function OperacionesCatalogo() {
  const router = useRouter();
  const [showNuevaOperacion, setShowNuevaOperacion] = useState(false);
  const {
    operaciones,
    loading,
    page,
    totalPages,
    setPage,
    tipoOptions,
    totalMonto,
    sort,
    onSortChange,
    filters,
    onFilterChange,
    filterOptions,
    filtersLoading,
  } = useOperacionesFiltrado();

  const filterFields: FilterField[] = [
    { key: 'tipo', label: 'Tipo', options: tipoOptions },
    { key: 'sucursal', label: 'Sucursal' },
    { key: 'usuario', label: 'Usuario', type: 'text' },
  ];

  const columns: TableColumn<Operacion>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (op) => <span className={styles.fechaCell}>{formatFecha(op.fecha)}</span>,
      sortable: true,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (op) => (
        <Badge variant={getTipoVariant(op.tipoNombre)}>{op.tipoNombre || '—'}</Badge>
      ),
      sortable: true,
    },
    {
      key: 'sucursal',
      header: 'Sucursal',
      render: (op) => op.sucursalNombre || '—',
      sortable: true,
    },
    {
      key: 'usuario',
      header: 'Usuario',
      render: (op) => <span className={styles.usuarioCell}>{op.usuarioNombre || '—'}</span>,
      sortable: true,
    },
    {
      key: 'monto',
      header: 'Monto',
      render: (op) => (
        <span className={`${styles.montoCell} ${op.monto < 0 ? styles.montoNegativo : styles.montoPositivo}`}>
          {formatMonto(op.monto)}
        </span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'acciones',
      header: '',
      render: (op) => (
        <div className={styles.rowActions}>
          <IconButton
            icon={<Eye size={16} />}
            label="Ver detalle"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/operaciones/${op.id}`);
            }}
          />
        </div>
      ),
      align: 'right',
      width: '1%',
    },
  ];


  return (
    <div className={styles.wrapper}>

      <Card
        title="Historial de operaciones"
        actions={
          <Button variant="primary" onClick={() => setShowNuevaOperacion(true)}>
            + Nueva operación
          </Button>
        }
      >
        <div className={styles.toolbar}>
          <FilterBar
            fields={filterFields}
            filters={filters}
            onFilterChange={onFilterChange}
            filterOptions={filterOptions}
            loading={filtersLoading}
          />
        </div>

        <Table
          columns={columns}
          data={operaciones}
          getRowKey={(op) => op.id}
          emptyMessage={loading ? 'Cargando operaciones...' : 'No se encontraron operaciones con los filtros aplicados.'}
          sort={sort}
          onSortChange={onSortChange}
          onRowClick={(op) => router.push(`/operaciones/${op.id}`)}
          stickyHeader
        />

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
      </Card>

      {showNuevaOperacion && (
        <NuevaOperacionModal onClose={() => setShowNuevaOperacion(false)} />
      )}
    </div>
  );
}
