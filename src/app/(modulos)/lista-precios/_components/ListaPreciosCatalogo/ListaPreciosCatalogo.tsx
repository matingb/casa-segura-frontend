'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, Building2 } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar, { FilterField } from '../../../../../components/ui/FilterBar/FilterBar';
import Combobox from '../../../../../components/ui/Combobox/Combobox';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import { StockItem } from '../../../../../lib/types/Stock';
import { useListaPrecios } from '../../_hooks/useListaPrecios';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { formatARS, formatPorcentaje, formatUSD } from '../../../../../lib/utils/formatters';
import { detalleCorto, detalleLargo } from '../../../../../lib/utils/niveles-descuento';
import { exportarListaPreciosExcel } from '../../_lib/exportExcel';
import { exportarListaPreciosPdf } from '../../_lib/exportPdf';
import ExportarColumnasModal from '../../../../../components/ExportarColumnasModal/ExportarColumnasModal';
import { EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMN_KEYS } from '../../_lib/exportColumns';
import styles from './ListaPreciosCatalogo.module.css';
import ContextoPrecios from '../../../../../components/ContextoPrecios';
import { useExportacionCotizacion } from '../../../../../lib/hooks/useExportacionCotizacion';

const FILTER_FIELDS: FilterField[] = [
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'subtipo', label: 'Subtipo' },
];

export default function ListaPreciosCatalogo() {
  const {
    sucursalId,
    sucursalOptions,
    contexto, error, actualizarSeleccion, precios,
    items,
    pageItems,
    page,
    totalPages,
    setPage,
    isLoading,
    sucursalNombre,
    sort,
    onSortChange,
    search,
    onSearchChange,
    filters,
    onFilterChange,
    filterOptions,
  } = useListaPrecios();
  const { getSubtipoNombre } = useClasificacion();

  const [showExportModal, setShowExportModal] = useState(false);
  const { comprobar, ocupado, dialogo } = useExportacionCotizacion();

  const handleConfirmExport = (selectedKeys: string[]) => {
    setShowExportModal(false);
    void comprobar({ contexto, conservar: () => exportarListaPreciosExcel(items, selectedKeys, sucursalNombre, getSubtipoNombre, contexto, precios), actualizar: async () => { const nuevos = await actualizarSeleccion(); exportarListaPreciosExcel(nuevos.items, selectedKeys, sucursalNombre, getSubtipoNombre, nuevos.items[0]?.contextoMonetario, nuevos.precios); } });
  };

  const handleExportPdf = () => {
    void comprobar({ contexto, conservar: () => exportarListaPreciosPdf(items, sucursalNombre, getSubtipoNombre, contexto, precios), actualizar: async () => { const nuevos = await actualizarSeleccion(); exportarListaPreciosPdf(nuevos.items, sucursalNombre, getSubtipoNombre, nuevos.items[0]?.contextoMonetario, nuevos.precios); } });
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
      header: 'Precio de lista',
      render: (item) => (
        <span className={(precios.get(item.id)?.descuentoTotalPorcentaje ?? 0) > 0 ? styles.priceTachado : styles.priceArs}>
          {formatARS(item.precioVentaArs)}
        </span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'descuento',
      header: 'Descuento',
      render: (item) => {
        const precio = precios.get(item.id);
        if (!precio || !(precio.descuentoTotalPorcentaje > 0)) return <span className={styles.sinDescuento}>0%</span>;
        return (
          <div title={detalleLargo(precio.descuentosAportes)}>
            <div className={styles.descuento}>{formatPorcentaje(precio.descuentoTotalPorcentaje)}</div>
            <div className={styles.descuentoDetalle}>{detalleCorto(precio.descuentosAportes)}</div>
            {precio.noAlcanzaMargen && Number(precio.precioListaArs) > 0 && (
              <div className={styles.ajustado} title={`Con los descuentos quedaba en ${formatARS(precio.precioSinTope)}. Se cobra el mínimo para no perder margen: ${formatARS(precio.precioMinimo)}.`}>
                Ajustado al precio mínimo
              </div>
            )}
          </div>
        );
      },
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'precioFinalArs',
      header: 'Precio final ARS',
      render: (item) => (
        <span className={styles.priceArs}>{formatARS(precios.get(item.id)?.precioFinalArs ?? item.precioVentaArs)}</span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'precioFinalUsd',
      header: 'Precio final USD',
      render: (item) => {
        const precio = precios.get(item.id);
        return <span className={styles.priceUsd}>{formatUSD(precio ? precio.precioFinalUsd : item.precioVentaUsd)}</span>;
      },
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
  ];

  const canExport = sucursalId && items.length > 0 && !isLoading && !ocupado;

  return (
    <Card
      title="Lista de Precios"
      actions={
        <div className={styles.exportActions}>
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
        <Button
          variant="primary"
          className={styles.exportBtn}
          onClick={handleExportPdf}
          disabled={!canExport}
          title="Exportar lista a PDF"
        >
          <FileDown size={16} />
          Exportar PDF
        </Button>
        </div>
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
          loading={isLoading}
        >
          <div className={styles.sucursalFilter}>
            <Combobox
              icon={<Building2 size={15} />}
              options={filterOptions.sucursal ?? sucursalOptions}
              value={sucursalId}
              onChange={(value) => onFilterChange('sucursal', value)}
              placeholder="Sucursal"
              loading={isLoading}
            />
          </div>
        </FilterBar>
      </div>

      <ContextoPrecios contexto={contexto} error={error} legado={items.some(item => item.precio?.estado === 'LEGADO_PENDIENTE_REVISION')} />
      {dialogo}
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
        <ExportarColumnasModal
          title="Exportar a Excel"
          columnas={EXPORT_COLUMNS}
          seleccionInicial={DEFAULT_EXPORT_COLUMN_KEYS}
          onClose={() => setShowExportModal(false)}
          onConfirm={handleConfirmExport}
        />
      )}
    </Card>
  );
}
