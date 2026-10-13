import * as XLSX from 'xlsx';
import { StockItem } from '../../../../lib/types/Stock';
import { ContextoMonetario } from '../../../../lib/types/Moneda';
import { fechaArchivoBuenosAires, metadatosPrecios, numeroExcel, validarSnapshotPrecios } from '../../../../lib/utils/exportacion-precios';
import { EXPORT_COLUMNS } from './exportColumns';
import { PreciosSucursal } from '../_hooks/useListaPrecios';

export function crearLibroListaPrecios(items: StockItem[], selectedKeys: string[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null, precios: PreciosSucursal = new Map()) {
  validarSnapshotPrecios(items.map(i => i.contextoMonetario), contexto);
  const columns = EXPORT_COLUMNS.filter(c => selectedKeys.includes(c.key));
  const rows = items.map(item => {
    const row: Record<string, string | number | boolean | null> = {};
    for (const column of columns) row[column.label] = column.getValue(item, getSubtipoNombre(item.subtipoId), precios.get(item.id));
    row['Moneda de referencia'] = item.precio?.moneda_referencia ?? 'ARS';
    row['Importe principal'] = numeroExcel(item.precio?.importe_referencia ?? item.precioVentaArs);
    row['Estado del precio'] = item.precio?.estado ?? 'LEGADO_PENDIENTE_REVISION';
    return row;
  });
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de precios');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(metadatosPrecios(contexto, items.some(i => i.precio?.estado === 'LEGADO_PENDIENTE_REVISION'), sucursalNombre)), 'Referencia');
  return workbook;
}
export function exportarListaPreciosExcel(items: StockItem[], selectedKeys: string[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null, precios?: PreciosSucursal) {
  const workbook = crearLibroListaPrecios(items, selectedKeys, sucursalNombre, getSubtipoNombre, contexto, precios);
  const sucursal = sucursalNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  XLSX.writeFile(workbook, `lista-precios-${sucursal}-${fechaArchivoBuenosAires()}.xlsx`);
}
