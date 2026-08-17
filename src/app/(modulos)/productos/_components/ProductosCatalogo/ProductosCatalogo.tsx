'use client';

import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Badge from '../../../../../components/ui/Badge/Badge';
import Input from '../../../../../components/ui/Input/Input';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import ScrollPage from '../../../../../components/ui/ScrollPage/ScrollPage';
import { Producto } from '../../../../../lib/types/Producto';
import { getSubtipoNombre } from '../../../../../lib/mocks/clasificacionProducto';
import { useProductosFiltrados } from '../../_hooks/useProductosFiltrados';
import styles from './ProductosCatalogo.module.css';

export default function ProductosCatalogo() {
  const router = useRouter();
  const { search, setSearch, items: productos, loading, loadingMore, hasMore, loadMore } = useProductosFiltrados();

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
    { key: 'codigo', header: 'Código', render: (producto) => producto.codigo },
    { key: 'nombre', header: 'Nombre', render: (producto) => producto.nombre },
    { key: 'marca', header: 'Marca', render: (producto) => producto.marca },
    { key: 'modelo', header: 'Modelo', render: (producto) => producto.modelo },
    { key: 'subtipo', header: 'Subtipo', render: (producto) => getSubtipoNombre(producto.subtipoId) },
    {
      key: 'estado',
      header: 'Estado',
      render: (producto) => (
        <Badge variant={producto.activo ? 'success' : 'neutral'}>
          {producto.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (producto) => (
        <div className={styles.rowActions}>
          <Button variant="secondary" onClick={() => router.push(`/productos/${producto.id}/editar`)}>
            Editar
          </Button>
        </div>
      ),
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
      <div className={styles.searchBar}>
        <Input
          placeholder="Buscar por código, nombre, marca o modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ScrollPage
        hasMore={hasMore}
        loading={loading}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        loadingMoreLabel="Cargando más productos..."
      >
        <Table
          columns={columns}
          data={productos}
          getRowKey={(producto) => producto.id}
          emptyMessage={loading ? 'Cargando productos...' : 'No se encontraron productos.'}
        />
      </ScrollPage>
    </Card>
  );
}
