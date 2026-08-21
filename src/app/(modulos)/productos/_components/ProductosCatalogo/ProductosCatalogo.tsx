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
import { Producto } from '../../../../../lib/types/Producto';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { useProductosFiltrados } from '../../_hooks/useProductosFiltrados';
import { formatARS } from '../../../../../lib/utils/formatters';
import styles from './ProductosCatalogo.module.css';

const FILTER_FIELDS: { key: string; label: string; type?: 'text' | 'select' }[] = [
  { key: 'codigo', label: 'Código', type: 'text' },
  { key: 'nombre', label: 'Nombre', type: 'text' },
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'subtipo', label: 'Subtipo' },
  { key: 'estado', label: 'Estado' },
];

export default function ProductosCatalogo() {
  const router = useRouter();
  const { getSubtipoNombre } = useClasificacion();
  const {
    items: productos,
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
  } = useProductosFiltrados();

  const columns: TableColumn<Producto>[] = [
    {
      key: 'imagen',
      header: 'Imagen',
      render: (producto) =>
        producto.imagenUrl ? (
          <img src={producto.imagenUrl} alt={producto.nombre} className={styles.thumbnail} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>Sin imagen</div>
        ),
    },
    { key: 'codigo', header: 'Código', render: (producto) => producto.codigo, sortable: true },
    {
      key: 'nombre',
      header: 'Nombre',
      render: (producto) => (
        <span className={styles.nombreCell} title={producto.nombre}>
          {producto.nombre}
        </span>
      ),
      sortable: true,
    },
    { key: 'marca', header: 'Marca', render: (producto) => producto.marca, sortable: true },
    { key: 'modelo', header: 'Modelo', render: (producto) => producto.modelo, sortable: true },
    { key: 'subtipo', header: 'Subtipo', render: (producto) => getSubtipoNombre(producto.subtipoId), sortable: true },
    {
      key: 'precioBase',
      header: 'Precio base',
      render: (producto) => (producto.precioBase ? formatARS(producto.precioBase) : '—'),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (producto) => (
        <Badge variant={producto.activo ? 'success' : 'neutral'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'acciones',
      header: '',
      render: (producto) => (
        <div className={styles.rowActions}>
          <IconButton
            icon={<Eye size={16} />}
            label="Ver detalle"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/productos/${producto.id}`);
            }}
          />
          <IconButton
            icon={<Pencil size={16} />}
            label="Editar"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/productos/${producto.id}/editar`);
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
      title="Catálogo de productos"
      actions={
        <Button variant="primary" onClick={() => router.push('/productos/nuevo')}>
          + Nuevo producto
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
        data={productos}
        getRowKey={(producto) => producto.id}
        emptyMessage={loading ? 'Cargando productos...' : 'No se encontraron productos.'}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={(producto) => router.push(`/productos/${producto.id}`)}
        stickyHeader
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
    </Card>
  );
}
