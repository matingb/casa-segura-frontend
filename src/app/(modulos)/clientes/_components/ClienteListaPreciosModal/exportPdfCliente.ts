import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatARS, formatUSD } from '../../../../../lib/utils/formatters';
import { fechaArchivoBuenosAires, metadatosPrecios } from '../../../../../lib/utils/exportacion-precios';
import { ContextoMonetario } from '../../../../../lib/types/Moneda';
import { ItemListaCliente } from '../../../../../lib/types/ListaPreciosCliente';
export type { ItemListaCliente } from '../../../../../lib/types/ListaPreciosCliente';
export interface DatosClienteExport {
  nombre: string; razonSocial?: string | null; nroDocumento?: string | null;
  descuentoHabitual?: number | null; regionNombre?: string | null; regionDescuento?: number | null;
}
export interface ExportClienteParams {
  items: ItemListaCliente[]; cliente: DatosClienteExport; sucursalNombre: string; contexto?: ContextoMonetario | null;
}
export function crearPdfListaPreciosCliente({ items, cliente, sucursalNombre, contexto }: ExportClienteParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(16); doc.text('Lista de precios personalizada', 14, 15);
  doc.setFontSize(8.5);
  let y = 22;
  const detalle = [cliente.nombre, cliente.razonSocial, cliente.nroDocumento].filter(Boolean).join(' · ');
  const metadata = metadatosPrecios(contexto, items.some(i => i.estadoPrecio === 'LEGADO_PENDIENTE_REVISION'), sucursalNombre, detalle);
  metadata.push(['Región', cliente.regionNombre ? `${cliente.regionNombre} (-${cliente.regionDescuento ?? 0}%)` : 'Sin región asignada']);
  metadata.push(['Descuento habitual', `${cliente.descuentoHabitual ?? 0}%`]);
  for (const [label, value] of metadata) {
    const lineas = doc.splitTextToSize(`${label}: ${value}`, 269); doc.text(lineas, 14, y); y += lineas.length * 4;
  }
  autoTable(doc, {
    startY: y + 3, margin: { top: 14, right: 14, bottom: 16, left: 14 },
    head: [['Código', 'Producto', 'Categoría', 'Lista ARS', 'Descuento', 'Cliente ARS', 'Cliente USD', 'Ref.']],
    body: items.map(item => [item.codigo, [item.nombre, item.marca, item.modelo].filter(Boolean).join(' - '), item.subtipoNombre, formatARS(item.precioListaArs), `-${item.descuentoTotalPorcentaje.toFixed(2)}%`, formatARS(item.precioFinalArs), formatUSD(item.precioFinalUsd), item.monedaReferencia ?? 'ARS']),
    showHead: 'everyPage', theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 80 }, 2: { cellWidth: 32 }, 3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 18 }, 5: { cellWidth: 30, halign: 'right' }, 6: { cellWidth: 35, halign: 'right' }, 7: { cellWidth: 22 } },
  });
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.text(`Página ${page} de ${total} · cotización v${contexto?.cotizacion_version ?? '0'}`, 283, 202, { align: 'right' });
  }
  return doc;
}
export function exportarListaPreciosClientePdf(params: ExportClienteParams) {
  const cli = params.cliente.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const suc = params.sucursalNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  crearPdfListaPreciosCliente(params).save(`lista-precios-${cli}-${suc}-${fechaArchivoBuenosAires()}.pdf`);
}
