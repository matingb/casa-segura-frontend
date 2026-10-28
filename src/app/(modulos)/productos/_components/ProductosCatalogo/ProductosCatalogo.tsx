'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Eye, Plus, Copy, Trash2, ImageIcon } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import ActionMenu from '../../../../../components/ui/ActionMenu/ActionMenu';
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

  // Producto | Subtipo | Precio base | Estado | Acciones. Se agrupan datos en
  // pocas columnas para que la tabla siga siendo legible con zoom alto.
  const columns: TableColumn<Producto>[] = [
    {
      // Ordena por nombre, el dato principal de la celda.
      key: 'nombre',
      header: 'Producto',
      render: (producto) => {
        const secundarios = [producto.codigo, producto.marca, producto.modelo].filter(Boolean);
        return (
          <div className={styles.productoCell}>
            {producto.imagenUrl ? (
              <img src={producto.imagenUrl} alt={producto.nombre} className={styles.thumbnail} />
            ) : (
              <div className={styles.thumbnailPlaceholder} aria-hidden="true">
                <ImageIcon size={18} />
              </div>
            )}
            <div className={styles.productoTexto}>
              <span className={styles.productoNombre}>{producto.nombre}</span>
              {secundarios.length > 0 && (
                <span className={styles.productoSecundario}>{secundarios.join(' · ')}</span>
              )}
            </div>
          </div>
        );
      },
      sortable: true,
    },
    {
      key: 'subtipo',
      header: 'Subtipo',
      render: (producto) => {
        const nombre = producto.subtipoId ? getSubtipoNombre(producto.subtipoId) : 'Sin subtipo';
        return (
          <span className={producto.subtipoId ? styles.subtipoChip : `${styles.subtipoChip} ${styles.subtipoVacio}`}>
            {nombre}
          </span>
        );
      },
      sortable: true,
    },
    {
      // Ordena por el precio en ARS (como la columna Base ARS anterior).
      key: 'precioBase',
      header: 'Precio base',
      render: (producto) => (
        <div className={styles.precioCell}>
          <span className={styles.precioValor}>
            <span className={styles.precioImporte}>{formatARS(producto.precio?.ars ?? producto.precioBase)}</span>
            <span className={styles.precioMoneda}>ARS</span>
          </span>
          <span className={styles.precioValor}>
            <span className={styles.precioImporte}>{formatUSD(producto.precio?.usd ?? producto.precioBaseUsd)}</span>
            <span className={styles.precioMoneda}>USD</span>
          </span>
        </div>
      ),
      sortable: true,
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
      width: '1%',
    },
    {
      key: 'acciones',
      header: '',
      render: (producto) => (
        <ActionMenu
          label={`Acciones de ${producto.nombre}`}
          items={[
            { label: 'Ver detalle', icon: <Eye size={16} />, onSelect: () => router.push(`/productos/${producto.id}`) },
            { label: 'Editar', icon: <Pencil size={16} />, onSelect: () => router.push(`/productos/${producto.id}/editar`) },
            { label: 'Duplicar', icon: <Copy size={16} />, onSelect: () => router.push(`/productos/nuevo?copiar=${producto.id}`) },
            { label: 'Eliminar', icon: <Trash2 size={16} />, variant: 'danger', onSelect: () => setAEliminar(producto) },
          ]}
        />
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
        ajustarAncho
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
