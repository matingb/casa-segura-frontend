'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Eye } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import IconButton from '../../../../../components/ui/IconButton/IconButton';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar from '../../../../../components/ui/FilterBar/FilterBar';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import { StockItem } from '../../../../../lib/types/Stock';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { useStockFiltrado } from '../../_hooks/useStockFiltrado';
import styles from './StockCatalogo.module.css';

const FILTER_FIELDS: { key: string; label: string; type?: 'text' | 'select' }[] = [
  { key: 'codigo', label: 'Código', type: 'text' },
  { key: 'nombre', label: 'Nombre', type: 'text' },
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'subtipo', label: 'Subtipo' },
  { key: 'sucursal', label: 'Sucursal' },
  { key: 'estado', label: 'Estado' },
];

function getDisponibleVariant(neto: number, minimo: number): 'warning' | 'danger' | null {
  if (neto <= 0) return 'danger';
  if (neto <= minimo) return 'warning';
  return null;
}

export default function StockCatalogo() {
  const router = useRouter();
  const { getSubtipoNombre } = useClasificacion();
  const {
    stock,
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
  } = useStockFiltrado();

  const columns: TableColumn<StockItem>[] = [
    {
      key: 'imagen',
      header: 'Imagen',
      render: (item) =>
        item.imagenUrl ? (
          <img src={item.imagenUrl} alt={item.nombre} className={styles.thumbnail} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>Sin imagen</div>
        ),
    },
    { key: 'codigo', header: 'Código', render: (item) => item.codigo, sortable: true },
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item) => (
        <span className={styles.nombreCell} title={item.nombre}>
          {item.nombre}
        </span>
      ),
      sortable: true,
    },
    { key: 'marca', header: 'Marca', render: (item) => item.marca, sortable: true },
    { key: 'modelo', header: 'Modelo', render: (item) => item.modelo, sortable: true },
    { key: 'subtipo', header: 'Subtipo', render: (item) => getSubtipoNombre(item.subtipoId), sortable: true },
    { key: 'sucursal', header: 'Sucursal', render: (item) => item.sucursalNombre, sortable: true },
    {
      key: 'cantidadDisponible',
      header: 'Disponible',
      render: (item) => {
        const neto = item.cantidadDisponible - item.cantidadReservada;
        const variant = getDisponibleVariant(neto, item.stockMinimo);
        return variant ? (
          <Badge variant={variant}>{item.cantidadDisponible}</Badge>
        ) : (
          <span className={styles.plainNumber}>{item.cantidadDisponible}</span>
        );
      },
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'cantidadReservada',
      header: 'Reservado',
      render: (item) => <span className={styles.plainNumber}>{item.cantidadReservada}</span>,
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'stockMinimo',
      header: 'Mín.',
      render: (item) => <span className={styles.plainNumber}>{item.stockMinimo}</span>,
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <Badge variant={item.activo ? 'success' : 'neutral'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className={styles.rowActions}>
          <IconButton
            icon={<Eye size={16} />}
            label="Ver detalle"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/stock/${item.id}`);
            }}
          />
          <IconButton
            icon={<Pencil size={16} />}
            label="Editar"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/stock/${item.id}/editar`);
            }}
          />
        </div>
      ),
      align: 'right',
      width: '1%',
    },
  ];

  return (
    <Card
      title="Catálogo de stock"
      actions={
        <Button variant="primary" onClick={() => router.push('/stock/nuevo')}>
          + Nuevo stock
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
        data={stock}
        getRowKey={(item) => item.id}
        emptyMessage={loading ? 'Cargando stock...' : 'No se encontraron items de stock.'}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={(item) => router.push(`/stock/${item.id}`)}
        stickyHeader
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
    </Card>
  );
}
