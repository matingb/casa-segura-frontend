'use client';

import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar from '../../../../../components/ui/FilterBar/FilterBar';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import { PedidoReposicion } from '../../../../../lib/types/PedidoReposicion';
import { usePedidosReposicionFiltrado } from '../../_hooks/usePedidosReposicionFiltrado';
import { formatFecha } from '../../../../../lib/utils/formatters';
import styles from './PedidosReposicionCatalogo.module.css';

const FILTER_FIELDS: { key: string; label: string; type?: 'text' | 'select' }[] = [
  { key: 'producto', label: 'Producto', type: 'text' },
  { key: 'sucursal', label: 'Sucursal' },
  { key: 'proveedor', label: 'Proveedor' },
  { key: 'estado', label: 'Estado' },
  { key: 'usuario', label: 'Usuario', type: 'text' },
];

function getEstadoVariant(estado: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const lower = estado.toLowerCase();
  if (lower === 'pendiente') return 'warning';
  if (lower === 'completado' || lower === 'recibido') return 'success';
  if (lower === 'cancelado') return 'danger';
  return 'neutral';
}

export default function PedidosReposicionCatalogo() {
  const router = useRouter();
  const {
    pedidos,
    loading,
    page,
    totalPages,
    setPage,
    sort,
    onSortChange,
    filters,
    onFilterChange,
    filterOptions,
    filtersLoading,
  } = usePedidosReposicionFiltrado();

  const columns: TableColumn<PedidoReposicion>[] = [
    { key: 'fecha', header: 'Fecha', render: (p) => formatFecha(p.fecha), sortable: true },
    {
      key: 'producto',
      header: 'Producto',
      render: (p) => (
        <span>
          {p.productoCodigo ? `[${p.productoCodigo}] ` : ''}{p.productoNombre}
        </span>
      ),
      sortable: true,
    },
    { key: 'sucursal', header: 'Sucursal', render: (p) => p.sucursalNombre || '—', sortable: true },
    { key: 'proveedor', header: 'Proveedor', render: (p) => p.proveedorNombre || '—', sortable: true },
    { key: 'cantidad', header: 'Cantidad', render: (p) => p.cantidad, sortable: true, align: 'right', width: '1%' },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => <Badge variant={getEstadoVariant(p.estado)}>{p.estado}</Badge>,
      sortable: true,
    },
    { key: 'usuario', header: 'Usuario', render: (p) => p.usuarioNombre || '—', sortable: true },
  ];

  return (
    <Card
      title="Pedidos de reposición"
      actions={
        <Button variant="primary" onClick={() => router.push('/pedidos-reposicion/nuevo')}>
          + Nuevo pedido
        </Button>
      }
    >
      <div className={styles.toolbar}>
        <FilterBar
          fields={FILTER_FIELDS}
          filters={filters}
          onFilterChange={onFilterChange}
          filterOptions={filterOptions}
          loading={filtersLoading}
        />
      </div>

      <Table
        columns={columns}
        data={pedidos}
        getRowKey={(p) => p.id}
        emptyMessage={loading ? 'Cargando pedidos...' : 'No se encontraron pedidos de reposición.'}
        sort={sort}
        onSortChange={onSortChange}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
    </Card>
  );
}
