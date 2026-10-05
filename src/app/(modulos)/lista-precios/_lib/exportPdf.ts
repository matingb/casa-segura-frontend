import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { StockItem } from '../../../../lib/types/Stock';
import { ContextoMonetario } from '../../../../lib/types/Moneda';
import { formatARS, formatUSD } from '../../../../lib/utils/formatters';
import { fechaArchivoBuenosAires, metadatosPrecios, validarSnapshotPrecios } from '../../../../lib/utils/exportacion-precios';
export function crearPdfListaPrecios(items: StockItem[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null) {
  validarSnapshotPrecios(items.map(i => i.contextoMonetario), contexto);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(16); doc.text('Lista de precios', 16, 16);
  doc.setFontSize(8);
  let y = 23;
  for (const [label, value] of metadatosPrecios(contexto, items.some(i => i.precio?.estado === 'LEGADO_PENDIENTE_REVISION'), sucursalNombre)) {
    const lineas = doc.splitTextToSize(`${label}: ${value}`, 178);
    doc.text(lineas, 16, y); y += lineas.length * 4;
  }
  autoTable(doc, {
    startY: y + 3, margin: { top: 16, right: 16, bottom: 16, left: 16 },
    head: [['Código', 'Producto', 'Subtipo', 'Precio ARS', 'Precio USD', 'Ref.', 'IVA']],
    body: items.map(item => [item.codigo, [item.nombre, item.marca, item.modelo].filter(Boolean).join('\n'), getSubtipoNombre(item.subtipoId), formatARS(item.precioVentaArs), formatUSD(item.precioVentaUsd), item.precio?.moneda_referencia ?? 'ARS', `${item.iva}%`]),
    showHead: 'everyPage', theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [38, 85, 145], textColor: 255 },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 50 }, 2: { cellWidth: 26 }, 3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 16 }, 6: { cellWidth: 14 } },
  });
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page); doc.setFontSize(8);
    doc.text(`Página ${page} de ${total} · cotización v${contexto?.cotizacion_version ?? '0'}`, 194, 289, { align: 'right' });
  }
  return doc;
}
export function exportarListaPreciosPdf(items: StockItem[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null) {
  crearPdfListaPrecios(items, sucursalNombre, getSubtipoNombre, contexto).save(`lista-precios-${sucursalNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${fechaArchivoBuenosAires()}.pdf`);
}
