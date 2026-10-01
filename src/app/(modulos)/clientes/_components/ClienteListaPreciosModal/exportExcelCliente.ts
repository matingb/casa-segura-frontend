import * as XLSX from 'xlsx';
import { DatosClienteExport, ItemListaCliente } from './exportPdfCliente';

export function exportarListaPreciosClienteExcel(params: {
  items: ItemListaCliente[];
  cliente: DatosClienteExport;
  sucursalNombre: string;
}) {
  const { items, cliente, sucursalNombre } = params;

  const rows = items.map((item) => ({
    'Código': item.codigo,
    'Producto': item.nombre,
    'Marca': item.marca ?? '',
    'Modelo': item.modelo ?? '',
    'Categoría / Subtipo': item.subtipoNombre,
    'Precio Lista ARS': item.precioListaArs,
    'Descuento Total (%)': item.descuentoTotalPorcentaje,
    'Precio Final ARS': item.precioFinalArs,
    'Precio Final USD': item.precioFinalUsd ?? '',
    'IVA (%)': item.iva ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  const sheetName = 'Lista de Precios';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const fecha = new Date().toISOString().slice(0, 10);
  const cliNombre = cliente.nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const sucNombre = sucursalNombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const nombreArchivo = `lista-precios-${cliNombre}-${sucNombre}-${fecha}.xlsx`;

  XLSX.writeFile(workbook, nombreArchivo);
}
