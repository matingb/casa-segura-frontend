import * as XLSX from 'xlsx';
import { StockItem } from '../../../../lib/types/Stock';
import { EXPORT_COLUMNS } from './exportColumns';

export function exportarListaPreciosExcel(
  items: StockItem[],
  selectedKeys: string[],
  sucursalNombre: string,
  getSubtipoNombre: (subtipoId: string) => string
) {
  const columns = EXPORT_COLUMNS.filter((c) => selectedKeys.includes(c.key));

  const rows = items.map((item) => {
    const row: Record<string, string | number | boolean> = {};
    for (const column of columns) {
      row[column.label] = column.getValue(item, getSubtipoNombre(item.subtipoId));
    }
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de precios');

  const fecha = new Date().toISOString().slice(0, 10);
  const nombreArchivo = `lista-precios-${sucursalNombre.toLowerCase().replace(/\s+/g, '-')}-${fecha}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);
}
