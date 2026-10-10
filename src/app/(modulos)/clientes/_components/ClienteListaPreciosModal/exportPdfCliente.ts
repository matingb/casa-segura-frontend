import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatARS, formatFecha } from '../../../../../lib/utils/formatters';
import { fechaArchivoBuenosAires } from '../../../../../lib/utils/exportacion-precios';
import { ContextoMonetario } from '../../../../../lib/types/Moneda';
import { FilaExportCliente, resolverColumnasCliente } from './columnasExportCliente';

export interface DatosClienteExport {
  nombre: string; razonSocial?: string | null; nroDocumento?: string | null;
}
export interface ExportClienteParams {
  filas: FilaExportCliente[];
  columnas: readonly string[];
  cliente: DatosClienteExport;
  sucursalNombre: string;
  contexto?: ContextoMonetario | null;
}

const MARGEN = 14;
const ANCHO_UTIL = { portrait: 210 - MARGEN * 2, landscape: 297 - MARGEN * 2 };

/** Encabezado que ve el cliente: quién, de qué punto de venta, cuándo y con qué dólar (si hay USD). */
export function encabezadoCliente({ cliente, sucursalNombre, contexto }: ExportClienteParams, incluyeUsd: boolean): Array<[string, string]> {
  const filas: Array<[string, string]> = [
    ['Cliente', [cliente.nombre, cliente.razonSocial].filter(Boolean).join(' · ')],
    ...(cliente.nroDocumento ? [['Documento', cliente.nroDocumento] as [string, string]] : []),
    ['Punto de venta', sucursalNombre],
    ['Fecha', formatFecha(new Date().toISOString())],
  ];
  if (incluyeUsd && contexto?.cotizacion_usd_ars) filas.push(['Dólar de referencia', formatARS(contexto.cotizacion_usd_ars)]);
  return filas;
}

export function crearPdfListaPreciosCliente(params: ExportClienteParams) {
  const columnas = resolverColumnasCliente(params.columnas, params.contexto?.cotizacion_usd_ars != null);
  const anchoTotal = columnas.reduce((total, c) => total + c.anchoPdf, 0);
  const orientation = anchoTotal > ANCHO_UTIL.portrait ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();

  doc.setFontSize(16); doc.text('Lista de precios', MARGEN, 16);
  doc.setFontSize(8.5);
  let y = 23;
  for (const [label, value] of encabezadoCliente(params, columnas.some(c => c.key === 'precioClienteUsd'))) {
    const lineas = doc.splitTextToSize(`${label}: ${value}`, anchoPagina - MARGEN * 2);
    doc.text(lineas, MARGEN, y); y += lineas.length * 4;
  }
  autoTable(doc, {
    startY: y + 3, margin: { top: MARGEN, right: MARGEN, bottom: 16, left: MARGEN },
    head: [columnas.map(c => c.label)],
    body: params.filas.map(fila => columnas.map(c => c.pdf(fila))),
    showHead: 'everyPage', theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    columnStyles: Object.fromEntries(columnas.map((c, i) => [i, {
      cellWidth: c.key === 'nombre' ? 'auto' : c.anchoPdf,
      halign: c.numerica ? 'right' : 'left',
    }])),
  });
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page); doc.setFontSize(8);
    doc.text(`Página ${page} de ${total}`, anchoPagina - MARGEN, altoPagina - 8, { align: 'right' });
  }
  return doc;
}

export function nombreArchivoCliente(params: ExportClienteParams, extension: 'pdf' | 'xlsx') {
  const slug = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `lista-precios-${slug(params.cliente.nombre)}-${slug(params.sucursalNombre)}-${fechaArchivoBuenosAires()}.${extension}`;
}

export function exportarListaPreciosClientePdf(params: ExportClienteParams) {
  crearPdfListaPreciosCliente(params).save(nombreArchivoCliente(params, 'pdf'));
}
