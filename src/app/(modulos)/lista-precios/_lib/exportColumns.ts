import { StockItem } from '../../../../lib/types/Stock';

export interface ExportColumn {
  key: string;
  label: string;
  getValue: (item: StockItem, subtipoNombre: string) => string | number | boolean;
}

export const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'codigo', label: 'Código', getValue: (item) => item.codigo },
  { key: 'nombre', label: 'Nombre', getValue: (item) => item.nombre },
  { key: 'marca', label: 'Marca', getValue: (item) => item.marca },
  { key: 'modelo', label: 'Modelo', getValue: (item) => item.modelo },
  { key: 'subtipo', label: 'Subtipo', getValue: (_item, subtipoNombre) => subtipoNombre },
  { key: 'sucursalNombre', label: 'Sucursal', getValue: (item) => item.sucursalNombre },
  { key: 'activo', label: 'Estado', getValue: (item) => (item.activo ? 'Habilitado' : 'Deshabilitado') },
  { key: 'costoReposicion', label: 'Costo de reposición', getValue: (item) => item.costoReposicion },
  { key: 'precioVentaArs', label: 'Precio venta ARS', getValue: (item) => item.precioVentaArs },
  { key: 'precioVentaUsd', label: 'Precio venta USD', getValue: (item) => item.precioVentaUsd },
  { key: 'iva', label: 'IVA (%)', getValue: (item) => item.iva },
  { key: 'margenMinimo', label: 'Margen mínimo (%)', getValue: (item) => item.margenMinimo },
  { key: 'stockMinimo', label: 'Stock mínimo', getValue: (item) => item.stockMinimo },
  { key: 'cantidadDisponible', label: 'Cantidad disponible', getValue: (item) => item.cantidadDisponible },
  { key: 'cantidadReservada', label: 'Cantidad reservada', getValue: (item) => item.cantidadReservada },
];

export const DEFAULT_EXPORT_COLUMN_KEYS = [
  'codigo',
  'nombre',
  'marca',
  'modelo',
  'precioVentaArs',
  'precioVentaUsd',
  'iva',
  'activo',
];
