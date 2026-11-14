'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, Building2, MapPin } from 'lucide-react';
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
import { nombreNivel, ordenarAportes, porcentajesDescuento } from '../../../../../lib/utils/niveles-descuento';
import Tooltip from '../../../../../components/ui/Tooltip/Tooltip';
import { exportarListaPreciosExcel } from '../../_lib/exportExcel';
import { exportarListaPreciosPdf } from '../../_lib/exportPdf';
import ExportarColumnasModal from '../../../../../components/ExportarColumnasModal/ExportarColumnasModal';
import { EXPORT_COLUMNS, PDF_EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMN_KEYS } from '../../_lib/exportColumns';
import styles from './ListaPreciosCatalogo.module.css';
import ContextoPrecios from '../../../../../components/ContextoPrecios';
import CeldaProducto from '../../../../../components/ui/Table/CeldaProducto';
import CeldaPrecio from '../../../../../components/ui/Table/CeldaPrecio';
import CeldaTexto from '../../../../../components/ui/Table/CeldaTexto';
import ChipClasificacion from '../../../../../components/ui/Table/ChipClasificacion';
import { useExportacionCotizacion } from '../../../../../lib/hooks/useExportacionCotizacion';

const FILTER_FIELDS: FilterField[] = [
  { key: 'marca', label: 'Marca' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'subtipo', label: 'Subcategoría' },
];

export default function ListaPreciosCatalogo() {
  const {
    sucursalId,
    sucursalOptions,
    regionId,
    regionOptions,
    onRegionChange,
    regionNombre,
    regionesDisponibles,
    cargandoRegiones,
    contexto, error, actualizarSeleccion, revalidarAcceso, precios,
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

  const [formatoExportacion, setFormatoExportacion] = useState<'Excel' | 'PDF' | null>(null);
  const { comprobar, ocupado, dialogo } = useExportacionCotizacion();

  const handleConfirmExport = (selectedKeys: string[]) => {
    if (!formatoExportacion) return;
    const exportar = formatoExportacion === 'PDF' ? exportarListaPreciosPdf : exportarListaPreciosExcel;
    setFormatoExportacion(null);
    void comprobar({
      contexto,
      conservar: async () => {
        await revalidarAcceso();
        exportar(items, selectedKeys, sucursalNombre, getSubtipoNombre, contexto, precios, regionNombre);
      },
      actualizar: async () => {
        const nuevos = await actualizarSeleccion();
        exportar(nuevos.items, selectedKeys, sucursalNombre, getSubtipoNombre, nuevos.contexto, nuevos.precios, nuevos.regionNombre ?? regionNombre);
      },
    });
  };

  // Producto | Clasificación | Precio | Descuento | Precio final | IVA, con las
  // mismas celdas que Productos y Stock. El precio final es el dato dominante;
  // el precio de lista queda como referencia (tachado si hay descuento).
  const columns: TableColumn<StockItem>[] = [
    {
      key: 'nombre',
      header: 'Producto',
      render: (item) => (
        <CeldaProducto nombre={item.nombre} imagenUrl={item.imagenUrl} secundarios={[item.codigo, item.marca, item.modelo]} />
      ),
      sortable: true,
    },
    {
      key: 'subtipo',
      header: 'Clasificación',
      render: (item) => <ChipClasificacion texto={getSubtipoNombre(item.subtipoId)} vacio={!item.subtipoId} />,
      sortable: true,
    },
    {
      key: 'precioArs',
      header: 'Precio',
      render: (item) => {
        const conDescuento = (precios.get(item.id)?.descuentoTotalPorcentaje ?? 0) > 0;
        return (
          <span className={conDescuento ? styles.precioTachado : styles.precioLista}>
            {formatARS(item.precioVentaArs)}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: 'descuento',
      header: 'Descuento',
      render: (item) => {
        const precio = precios.get(item.id);
        if (!precio || !(precio.descuentoTotalPorcentaje > 0)) return <span className={styles.sinDescuento}>0%</span>;
        // Segunda línea: los porcentajes que se aplican ("3% / 7%": producto,
        // categoría, PDV, región), con el nombre de cada uno en el tooltip; o,
        // si se topeó, el aviso de precio mínimo.
        const ajustado = precio.noAlcanzaMargen && Number(precio.precioListaArs) > 0;
        const aportes = ordenarAportes(precio.descuentosAportes);
        const segunda = ajustado ? (
          <Tooltip
            content={`Con los descuentos quedaba en ${formatARS(precio.precioSinTope)}. Se cobra el mínimo para no perder margen: ${formatARS(precio.precioMinimo)}.`}
          >
            <span className={styles.ajustado}>
              Ajustado al precio mínimo
            </span>
          </Tooltip>
        ) : aportes.length > 0 ? (
          <Tooltip
            contenido={
              <ul className={styles.nivelesTooltip}>
                {aportes.map((aporte, i) => (
                  <li key={i}>
                    <span>{nombreNivel(aporte.nivel)}</span>
                    <span className={styles.nivelPorcentaje}>{formatPorcentaje(aporte.porcentaje)}</span>
                  </li>
                ))}
              </ul>
            }
          >
            <span className={styles.porcentajes}>{porcentajesDescuento(aportes)}</span>
          </Tooltip>
        ) : null;
        return (
          <div className={styles.descuentoCelda}>
            <CeldaTexto
              principal={<span className={styles.descuento}>{formatPorcentaje(precio.descuentoTotalPorcentaje)}</span>}
              secundarias={segunda ? [segunda] : []}
            />
          </div>
        );
      },
      sortable: true,
    },
    {
      key: 'precioFinalArs',
      header: 'Precio final',
      render: (item) => {
        const precio = precios.get(item.id);
        return (
          <CeldaPrecio
            ars={formatARS(precio?.precioFinalArs ?? item.precioVentaArs)}
            usd={formatUSD(precio ? precio.precioFinalUsd : item.precioVentaUsd)}
          />
        );
      },
      sortable: true,
    },
    {
      key: 'iva',
      header: 'IVA',
      render: (item) => <span className={styles.ivaTag}>{item.iva}%</span>,
      sortable: true,
      align: 'center',
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
          onClick={() => setFormatoExportacion('Excel')}
          disabled={!canExport}
          title={!sucursalId ? 'Seleccioná una sucursal primero' : !items.length ? 'No hay productos habilitados' : 'Exportar lista a Excel'}
        >
          <FileSpreadsheet size={16} />
          Exportar Excel
        </Button>
        <Button
          variant="primary"
          className={styles.exportBtn}
          onClick={() => setFormatoExportacion('PDF')}
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
          <div className={styles.regionFilter}>
            <Combobox
              icon={<MapPin size={15} />}
              options={filterOptions.region ?? regionOptions}
              value={regionId}
              onChange={(value) => {
                if (onRegionChange) onRegionChange(value);
                onFilterChange('region', value);
              }}
              placeholder={!sucursalId ? 'Región' : ((regionesDisponibles === 0 || regionOptions.length <= 1) && !cargandoRegiones ? 'Sin regiones' : 'Región')}
              loading={cargandoRegiones || isLoading}
              disabled={!sucursalId || ((regionesDisponibles === 0 || regionOptions.length <= 1) && !cargandoRegiones)}
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
          <p className={styles.emptyStateTitle}>No hay productos disponibles</p>
          <p className={styles.emptyStateHint}>
            No se encontraron productos activos con stock para los filtros seleccionados.
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
            ajustarAncho
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {formatoExportacion && (
        <ExportarColumnasModal
          title={`Exportar a ${formatoExportacion}`}
          columnas={formatoExportacion === 'PDF' ? PDF_EXPORT_COLUMNS : EXPORT_COLUMNS}
          seleccionInicial={DEFAULT_EXPORT_COLUMN_KEYS}
          onClose={() => setFormatoExportacion(null)}
          onConfirm={handleConfirmExport}
        />
      )}
    </Card>
  );
}
