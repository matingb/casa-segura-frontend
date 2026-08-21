'use client';

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar, { FilterField } from '../../../../../components/ui/FilterBar/FilterBar';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import { StockItem } from '../../../../../lib/types/Stock';
import { useListaPrecios } from '../../_hooks/useListaPrecios';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { formatARS, formatUSD } from '../../../../../lib/utils/formatters';
import { exportarListaPreciosExcel } from '../../_lib/exportExcel';
import ExportExcelModal from '../ExportExcelModal/ExportExcelModal';
import styles from './ListaPreciosCatalogo.module.css';

const FILTER_FIELDS: FilterField[] = [
  { key: 'sucursal', label: 'Sucursal', required: true },
  { key: 'codigo', label: 'Código', type: 'text' },
  { key: 'nombre', label: 'Nombre', type: 'text' },
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'subtipo', label: 'Subtipo' },
];

export default function ListaPreciosCatalogo() {
  const {
    sucursalId,
    items,
    pageItems,
    page,
    totalPages,
    setPage,
    isLoading,
    sucursalNombre,
    sort,
    onSortChange,
    filters,
    onFilterChange,
    filterOptions,
  } = useListaPrecios();
  const { getSubtipoNombre } = useClasificacion();

  const [showExportModal, setShowExportModal] = useState(false);

  const handleConfirmExport = (selectedKeys: string[]) => {
    exportarListaPreciosExcel(items, selectedKeys, sucursalNombre, getSubtipoNombre);
    setShowExportModal(false);
  };

  const columns: TableColumn<StockItem>[] = [
    {
      key: 'imagen',
      header: 'Img.',
      render: (item) =>
        item.imagenUrl ? (
          <img
            src={item.imagenUrl}
            alt={item.nombre}
            className={styles.thumbnail}
          />
        ) : (
          <div className={styles.thumbnailPlaceholder}>Sin imagen</div>
        ),
    },
    { key: 'codigo', header: 'Código', render: (item) => item.codigo, sortable: true },
    { key: 'nombre', header: 'Nombre', render: (item) => item.nombre, sortable: true },
    { key: 'marca', header: 'Marca', render: (item) => item.marca, sortable: true },
    { key: 'modelo', header: 'Modelo', render: (item) => item.modelo, sortable: true },
    {
      key: 'subtipo',
      header: 'Subtipo',
      render: (item) => getSubtipoNombre(item.subtipoId),
      sortable: true,
    },
    {
      key: 'precioArs',
      header: 'Precio ARS',
      render: (item) => (
        <span className={styles.priceArs}>{formatARS(item.precioVentaArs)}</span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'precioUsd',
      header: 'Precio USD',
      render: (item) => (
        <span className={styles.priceUsd}>{formatUSD(item.precioVentaUsd)}</span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'iva',
      header: 'IVA',
      render: (item) => (
        <span className={styles.ivaTag}>{item.iva}%</span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: () => <Badge variant="success">Habilitado</Badge>,
    },
  ];

  const canExport = sucursalId && items.length > 0;

  return (
    <Card
      title="Lista de Precios"
      actions={
        <Button
          variant="primary"
          className={styles.exportBtn}
          onClick={() => setShowExportModal(true)}
          disabled={!canExport}
          title={!sucursalId ? 'Seleccioná una sucursal primero' : !items.length ? 'No hay productos habilitados' : 'Exportar lista a Excel'}
        >
          <FileSpreadsheet size={16} />
          Exportar Excel
        </Button>
      }
    >
      <div className={styles.toolbar}>
        <FilterBar
          fields={FILTER_FIELDS}
          filters={filters}
          onFilterChange={onFilterChange}
          filterOptions={filterOptions}
        />
      </div>

      {isLoading ? (
        <p className={styles.loadingText}>Cargando lista de precios…</p>
      ) : !sucursalId ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>Seleccioná una sucursal</p>
          <p className={styles.emptyStateHint}>
            Elegí una sucursal para ver sus productos habilitados con precios.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>Sin productos habilitados</p>
          <p className={styles.emptyStateHint}>
            La sucursal <strong>{sucursalNombre}</strong> no tiene productos habilitados en stock.
          </p>
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={pageItems}
            getRowKey={(item) => item.id}
            emptyMessage="No se encontraron productos."
            sort={sort}
            onSortChange={onSortChange}
            stickyHeader
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {showExportModal && (
        <ExportExcelModal onClose={() => setShowExportModal(false)} onConfirm={handleConfirmExport} />
      )}
    </Card>
  );
}
