import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { StockItem } from '../../../../lib/types/Stock';
import { ContextoMonetario } from '../../../../lib/types/Moneda';
import { formatARS, formatUSD } from '../../../../lib/utils/formatters';
import { fechaArchivoBuenosAires, metadatosPrecios, validarSnapshotPrecios } from '../../../../lib/utils/exportacion-precios';
import { PreciosSucursal } from '../_hooks/useListaPrecios';
export function crearPdfListaPrecios(items: StockItem[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null, precios: PreciosSucursal = new Map()) {
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
    // Precio de lista y final, sin la columna de descuento.
    head: [['Código', 'Producto', 'Subtipo', 'Lista ARS', 'Final ARS', 'Final USD', 'Ref.', 'IVA']],
    body: items.map(item => {
      const precio = precios.get(item.id);
      return [item.codigo, [item.nombre, item.marca, item.modelo].filter(Boolean).join('\n'), getSubtipoNombre(item.subtipoId),
        formatARS(item.precioVentaArs), formatARS(precio?.precioFinalArs ?? item.precioVentaArs),
        formatUSD(precio ? precio.precioFinalUsd : item.precioVentaUsd), item.precio?.moneda_referencia ?? 'ARS', `${item.iva}%`];
    }),
    showHead: 'everyPage', theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [38, 85, 145], textColor: 255 },
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 44 }, 2: { cellWidth: 22 }, 3: { cellWidth: 23, halign: 'right' }, 4: { cellWidth: 23, halign: 'right' }, 5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 12 }, 7: { cellWidth: 12 } },
  });
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page); doc.setFontSize(8);
    doc.text(`Página ${page} de ${total} · cotización v${contexto?.cotizacion_version ?? '0'}`, 194, 289, { align: 'right' });
  }
  return doc;
}
export function exportarListaPreciosPdf(items: StockItem[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null, precios?: PreciosSucursal) {
  crearPdfListaPrecios(items, sucursalNombre, getSubtipoNombre, contexto, precios).save(`lista-precios-${sucursalNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${fechaArchivoBuenosAires()}.pdf`);
}
