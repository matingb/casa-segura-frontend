'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Eye, Plus, Copy, Trash2 } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import IconButton from '../../../../../components/ui/IconButton/IconButton';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar from '../../../../../components/ui/FilterBar/FilterBar';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import ConfirmActionModal from '../../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import { useToast } from '../../../../../context/ToastContext';
import { Producto } from '../../../../../lib/types/Producto';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { productoClient } from '../../../../../lib/api/producto.client';
import { useCatalogoPaginado } from '../../../../../lib/hooks/useTableQuery';
import { formatARS, formatUSD } from '../../../../../lib/utils/formatters';
import { useCotizacion } from '../../../../../context/CotizacionContext';
import styles from './ProductosCatalogo.module.css';

const SELECT_FILTER_FIELDS = ['marca', 'modelo', 'subtipo', 'estado'] as const;

const FILTER_FIELDS: { key: string; label: string; type?: 'text' | 'select' }[] = [
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'subtipo', label: 'Subtipo' },
  { key: 'estado', label: 'Estado' },
];

export default function ProductosCatalogo() {
  const router = useRouter();
  const { revision } = useCotizacion();
  const { getSubtipoNombre } = useClasificacion();
  const { showSuccess, showError } = useToast();
  const [aEliminar, setAEliminar] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState(false);
  // Se incrementa para recargar el listado después de eliminar.
  const [recargas, setRecargas] = useState(0);
  const {
    items: productos,
    loading,
    page,
    totalPages,
    setPage,
    search,
    onSearchChange,
    sort,
    onSortChange,
    filters,
    onFilterChange,
    filterOptions,
    filtersLoading,
  } = useCatalogoPaginado(productoClient, SELECT_FILTER_FIELDS, { refreshKey: `${revision}-${recargas}` });

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await productoClient.eliminar(aEliminar.id);
      showSuccess(`Producto "${aEliminar.nombre}" eliminado.`);
      setAEliminar(null);
      setRecargas((n) => n + 1);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
    } finally {
      setEliminando(false);
    }
  };

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
      header: 'Base ARS',
      render: (producto) => formatARS(producto.precio?.ars ?? producto.precioBase),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'precioBaseUsd', header: 'Base USD', render: producto => formatUSD(producto.precio?.usd ?? producto.precioBaseUsd), sortable: true, align: 'right',
    },
    { key: 'referencia', header: 'Referencia', render: producto => producto.precio?.moneda_referencia ?? 'ARS' },
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
          <IconButton
            icon={<Copy size={16} />}
            label="Copiar"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/productos/nuevo?copiar=${producto.id}`);
            }}
          />
          <IconButton
            icon={<Trash2 size={16} />}
            label="Eliminar"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              setAEliminar(producto);
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
          <Plus size={16} aria-hidden="true" /> Nuevo producto
        </Button>
      }
    >
      <div className={styles.toolbar}>
        <FilterBar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar por código o nombre..."
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

      {aEliminar && (
        <ConfirmActionModal
          title="Eliminar producto"
          description={`Se dará de baja "${aEliminar.nombre}" y sus configuraciones de stock. Solo es posible si no tiene stock disponible ni reservado.`}
          confirmLabel="Eliminar producto"
          isConfirming={eliminando}
          onConfirm={confirmarEliminar}
          onClose={() => setAEliminar(null)}
        />
      )}
    </Card>
  );
}
