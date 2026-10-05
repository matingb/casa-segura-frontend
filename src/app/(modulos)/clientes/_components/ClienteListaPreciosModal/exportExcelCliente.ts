import * as XLSX from 'xlsx';
import { ExportClienteParams } from './exportPdfCliente';
import { fechaArchivoBuenosAires, metadatosPrecios, numeroExcel } from '../../../../../lib/utils/exportacion-precios';
export function crearLibroListaPreciosCliente({ items, cliente, sucursalNombre, contexto }: ExportClienteParams) {
  const rows = items.map(item => ({
    'Código': item.codigo, 'Producto': item.nombre, 'Marca': item.marca ?? '', 'Modelo': item.modelo ?? '',
    'Categoría / Subtipo': item.subtipoNombre, 'Precio Lista ARS': numeroExcel(item.precioListaArs),
    'Descuento Total (%)': item.descuentoTotalPorcentaje, 'Precio Final ARS': numeroExcel(item.precioFinalArs),
    'Precio Final USD': numeroExcel(item.precioFinalUsd), 'IVA (%)': numeroExcel(item.iva),
    'Moneda de referencia': item.monedaReferencia ?? 'ARS', 'Importe principal de lista': numeroExcel(item.importeReferencia),
    'Importe final principal': numeroExcel(item.importeFinalReferencia), 'Estado del precio': item.estadoPrecio ?? '',
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Lista de Precios');
  const metadata = metadatosPrecios(contexto, items.some(i => i.estadoPrecio === 'LEGADO_PENDIENTE_REVISION'), sucursalNombre, cliente.nombre);
  metadata.push(['Razón social', cliente.razonSocial ?? ''], ['Documento', cliente.nroDocumento ?? ''],
    ['Región', cliente.regionNombre ?? 'Sin región'], ['Descuento de región', String(cliente.regionDescuento ?? 0)], ['Descuento habitual', String(cliente.descuentoHabitual ?? 0)]);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(metadata), 'Referencia');
  return workbook;
}
export function exportarListaPreciosClienteExcel(params: ExportClienteParams) {
  const cli = params.cliente.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const suc = params.sucursalNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  XLSX.writeFile(crearLibroListaPreciosCliente(params), `lista-precios-${cli}-${suc}-${fechaArchivoBuenosAires()}.xlsx`);
}
