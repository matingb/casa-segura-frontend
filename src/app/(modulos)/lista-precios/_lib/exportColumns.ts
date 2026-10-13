import { StockItem } from '../../../../lib/types/Stock';
import { numeroExcel } from '../../../../lib/utils/exportacion-precios';
import { ItemConMargenCalculado } from '../../../../lib/types/ListaPreciosCliente';

export interface ExportColumn {
  key: string;
  label: string;
  /** `precio` = el mismo producto con los descuentos generales de la sucursal (si se calcularon). */
  getValue: (item: StockItem, subtipoNombre: string, precio?: ItemConMargenCalculado) => string | number | boolean | null;
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
  { key: 'precioVentaArs', label: 'Precio de lista ARS', getValue: (item) => numeroExcel(item.precio?.ars ?? item.precioVentaArs) },
  { key: 'precioVentaUsd', label: 'Precio de lista USD', getValue: (item) => numeroExcel(item.precio?.usd ?? item.precioVentaUsd) },
  // Sin columna de descuento: el archivo lleva el precio de lista y el final.
  { key: 'precioFinalArs', label: 'Precio final ARS', getValue: (item, _s, precio) => numeroExcel(precio?.precioFinalArs ?? item.precio?.ars ?? item.precioVentaArs) },
  { key: 'precioFinalUsd', label: 'Precio final USD', getValue: (item, _s, precio) => numeroExcel(precio ? precio.precioFinalUsd : item.precio?.usd ?? item.precioVentaUsd) },
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
  'precioFinalArs',
  'precioFinalUsd',
  'iva',
  'activo',
];
