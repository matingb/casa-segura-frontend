'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Eye, Plus, AlertTriangle } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import ActionMenu from '../../../../../components/ui/ActionMenu/ActionMenu';
import CeldaProducto from '../../../../../components/ui/Table/CeldaProducto';
import CeldaPrecio from '../../../../../components/ui/Table/CeldaPrecio';
import CeldaTexto from '../../../../../components/ui/Table/CeldaTexto';
import TextoRecortado from '../../../../../components/ui/TextoRecortado/TextoRecortado';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar from '../../../../../components/ui/FilterBar/FilterBar';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import { StockItem } from '../../../../../lib/types/Stock';
import { stockClient } from '../../../../../lib/api/stock.client';
import { useCatalogoPaginado } from '../../../../../lib/hooks/useTableQuery';
import styles from './StockCatalogo.module.css';
import { formatARS, formatUSD } from '../../../../../lib/utils/formatters';
import { useCotizacion } from '../../../../../context/CotizacionContext';

const SELECT_FILTER_FIELDS = ['marca', 'modelo', 'subtipo', 'sucursal', 'estado'] as const;

const FILTER_FIELDS: { key: string; label: string; type?: 'text' | 'select' }[] = [
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'subtipo', label: 'Subtipo' },
  { key: 'sucursal', label: 'Sucursal' },
  { key: 'estado', label: 'Estado' },
];

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

/**
 * Cómo se ve el disponible (solo presentación, el dato no se toca). Se evalúa
 * el stock libre (disponible − reservado), como la tabla anterior:
 * - disponible negativo → dato inconsistente;
 * - libre en 0 o menos → rojo;
 * - libre en el mínimo o debajo → naranja.
 */
function nivelDisponible(disponible: number, reservado: number, minimo: number): 'inconsistente' | 'error' | 'advertencia' | null {
  if (disponible < 0) return 'inconsistente';
  const libre = disponible - reservado;
  if (libre <= 0) return 'error';
  if (libre <= minimo) return 'advertencia';
  return null;
}

const AVISO_STOCK = {
  inconsistente: 'Dato inconsistente',
  error: 'Sin stock libre (disponible − reservado)',
  advertencia: 'Stock libre en el mínimo o debajo',
};

export default function StockCatalogo() {
  const router = useRouter();
  const { revision } = useCotizacion();
  const {
    items: stock,
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
  } = useCatalogoPaginado(stockClient, SELECT_FILTER_FIELDS, { refreshKey: revision });

  // Producto | Sucursal | Precio de venta | Stock | Estado | Acciones,
  // con las mismas celdas que Productos y Clientes.
  const columns: TableColumn<StockItem>[] = [
    {
      // Ordena por nombre, el dato principal de la celda.
      key: 'nombre',
      header: 'Producto',
      render: (item) => (
        <CeldaProducto nombre={item.nombre} imagenUrl={item.imagenUrl} secundarios={[item.codigo, item.marca, item.modelo]} />
      ),
      sortable: true,
    },
    {
      key: 'sucursal',
      header: 'Sucursal',
      render: (item) => <TextoRecortado>{item.sucursalNombre}</TextoRecortado>,
      sortable: true,
    },
    {
      // Ordena por el precio en ARS (como la columna Venta ARS anterior).
      key: 'precioVentaArs',
      header: 'Precio de venta',
      render: (item) => (
        <CeldaPrecio
          ars={formatARS(item.precio?.ars ?? item.precioVentaArs)}
          usd={formatUSD(item.precio?.usd ?? item.precioVentaUsd)}
        />
      ),
      sortable: true,
    },
    {
      // Ordena por disponible, el dato principal de la celda.
      key: 'cantidadDisponible',
      header: 'Stock',
      render: (item) => {
        const nivel = nivelDisponible(item.cantidadDisponible, item.cantidadReservada, item.stockMinimo);
        const detalle = `${plural(item.cantidadReservada, 'reservado', 'reservados')} · mín. ${item.stockMinimo}`;
        const principal = (
          <span
            className={nivel === 'advertencia' ? styles.stockAdvertencia : nivel ? styles.stockError : undefined}
            title={nivel ? AVISO_STOCK[nivel] : undefined}
          >
            {plural(item.cantidadDisponible, 'disponible', 'disponibles')}
            {nivel && <AlertTriangle size={14} className={styles.stockIcono} aria-label={AVISO_STOCK[nivel]} />}
          </span>
        );
        // Con un disponible negativo la segunda línea avisa la inconsistencia;
        // reservados y mínimo quedan en el tooltip para no agrandar la fila.
        return nivel === 'inconsistente' ? (
          <span title={detalle}>
            <CeldaTexto principal={principal} secundarias={[<span key="error" className={styles.stockError}>Dato inconsistente</span>]} />
          </span>
        ) : (
          <CeldaTexto principal={principal} secundarias={[detalle]} lineasSecundarias={1} />
        );
      },
      sortable: true,
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
      width: '1%',
    },
    {
      key: 'acciones',
      header: '',
      render: (item) => (
        <ActionMenu
          label={`Acciones de ${item.nombre} en ${item.sucursalNombre}`}
          items={[
            { label: 'Ver detalle', icon: <Eye size={16} />, onSelect: () => router.push(`/stock/${item.id}`) },
            { label: 'Editar', icon: <Pencil size={16} />, onSelect: () => router.push(`/stock/${item.id}/editar`) },
          ]}
        />
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
          <Plus size={16} aria-hidden="true" /> Nuevo stock
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
        data={stock}
        getRowKey={(item) => item.id}
        emptyMessage={loading ? 'Cargando stock...' : 'No se encontraron items de stock.'}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={(item) => router.push(`/stock/${item.id}`)}
        stickyHeader
        ajustarAncho
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
    </Card>
  );
}
