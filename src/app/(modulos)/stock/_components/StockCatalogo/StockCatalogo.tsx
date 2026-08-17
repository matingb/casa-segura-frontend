'use client';

import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Badge from '../../../../../components/ui/Badge/Badge';
import Input from '../../../../../components/ui/Input/Input';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import Dropdown from '../../../../../components/ui/Dropdown/Dropdown';
import ScrollPage from '../../../../../components/ui/ScrollPage/ScrollPage';
import { StockItem } from '../../../../../lib/types/Stock';
import { getSubtipoNombre } from '../../../../../lib/mocks/clasificacionProducto';
import { useStockFiltrado } from '../../_hooks/useStockFiltrado';
import styles from './StockCatalogo.module.css';

export default function StockCatalogo() {
  const router = useRouter();
  const {
    search,
    setSearch,
    sucursalId,
    setSucursalId,
    sucursalOptions,
    stock,
    loading,
    loadingMore,
    hasMore,
    loadMore,
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
    { key: 'codigo', header: 'Código', render: (item) => item.codigo },
    { key: 'nombre', header: 'Nombre', render: (item) => item.nombre },
    { key: 'marca', header: 'Marca', render: (item) => item.marca },
    { key: 'modelo', header: 'Modelo', render: (item) => item.modelo },
    { key: 'subtipo', header: 'Subtipo', render: (item) => getSubtipoNombre(item.subtipoId) },
    { key: 'sucursal', header: 'Sucursal', render: (item) => item.sucursalNombre },
    {
      key: 'disponible',
      header: 'Disponible',
      render: (item) => (
        <span className={`${styles.stockBadge} ${item.cantidadDisponible <= item.stockMinimo ? styles.stockBadgeLow : styles.stockBadgeOk}`}>
          {item.cantidadDisponible}
        </span>
      ),
    },
    {
      key: 'reservado',
      header: 'Reservado',
      render: (item) => (
        <span className={styles.stockBadge}>{item.cantidadReservada}</span>
      ),
    },
    {
      key: 'stockMinimo',
      header: 'Mín.',
      render: (item) => (
        <span className={styles.stockBadgeMuted}>{item.stockMinimo}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <Badge variant={item.activo ? 'success' : 'neutral'}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <div className={styles.rowActions}>
          <Button variant="secondary" onClick={() => router.push(`/stock/${item.id}/editar`)}>
            Editar
          </Button>
        </div>
      ),
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
        <div className={styles.searchBar}>
          <Input
            placeholder="Buscar por código, nombre, marca, modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.dropdownWrapper}>
          <Dropdown
            id="filtro-sucursal"
            label="Sucursal"
            options={sucursalOptions}
            value={sucursalId}
            onChange={setSucursalId}
          />
        </div>
      </div>

      <ScrollPage
        hasMore={hasMore}
        loading={loading}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        loadingMoreLabel="Cargando más stock..."
      >
        <Table
          columns={columns}
          data={stock}
          getRowKey={(item) => item.id}
          emptyMessage={loading ? 'Cargando stock...' : 'No se encontraron items de stock.'}
        />
      </ScrollPage>
    </Card>
  );
}
