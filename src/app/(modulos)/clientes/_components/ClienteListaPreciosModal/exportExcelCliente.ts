import * as XLSX from 'xlsx';
import { ExportClienteParams, encabezadoCliente, nombreArchivoCliente } from './exportPdfCliente';
import { resolverColumnasCliente } from './columnasExportCliente';

export function crearLibroListaPreciosCliente(params: ExportClienteParams) {
  const columnas = resolverColumnasCliente(params.columnas, params.contexto?.cotizacion_usd_ars != null);
  const rows = params.filas.map(fila => Object.fromEntries(columnas.map(c => [c.label, c.excel(fila)])));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: columnas.map(c => c.label) }), 'Lista de precios');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(encabezadoCliente(params, columnas.some(c => c.key === 'precioClienteUsd'))), 'Datos');
  return workbook;
}

export function exportarListaPreciosClienteExcel(params: ExportClienteParams) {
  XLSX.writeFile(crearLibroListaPreciosCliente(params), nombreArchivoCliente(params, 'xlsx'));
}
