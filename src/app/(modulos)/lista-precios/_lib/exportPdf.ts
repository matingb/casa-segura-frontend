import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { StockItem } from '../../../../lib/types/Stock';
import { ContextoMonetario } from '../../../../lib/types/Moneda';
import { formatARS, formatUSD } from '../../../../lib/utils/formatters';
import { fechaArchivoBuenosAires, metadatosPrecios, validarSnapshotPrecios } from '../../../../lib/utils/exportacion-precios';
import { PreciosSucursal } from '../_hooks/useListaPrecios';
import { PDF_EXPORT_COLUMNS } from './exportColumns';

const MARGEN = 16;

export function crearPdfListaPrecios(items: StockItem[], selectedKeys: string[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null, precios: PreciosSucursal = new Map()) {
  validarSnapshotPrecios(items.map(i => i.contextoMonetario), contexto);
  const columnas = PDF_EXPORT_COLUMNS.filter(c => selectedKeys.includes(c.key));
  if (columnas.length === 0) throw new Error('Seleccioná al menos una columna para exportar.');
  const anchos = columnas.map(c => c.key === 'nombre' ? 42 : 23);
  const identificador = columnas.findIndex(c => c.key === 'codigo' || c.key === 'nombre');
  const orientation = anchos.reduce((total, ancho) => total + ancho, 0) > 210 - MARGEN * 2 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  doc.setFontSize(16); doc.text('Lista de precios', 16, 16);
  doc.setFontSize(8);
  let y = 23;
  for (const [label, value] of metadatosPrecios(contexto, items.some(i => i.precio?.estado === 'LEGADO_PENDIENTE_REVISION'), sucursalNombre)) {
    const lineas = doc.splitTextToSize(`${label}: ${value}`, anchoPagina - MARGEN * 2);
    doc.text(lineas, 16, y); y += lineas.length * 4;
  }
  autoTable(doc, {
    startY: y + 3, margin: { top: 16, right: 16, bottom: 16, left: 16 },
    head: [columnas.map(c => c.label)],
    body: items.map(item => {
      const precio = precios.get(item.id);
      const subcategoria = getSubtipoNombre(item.subtipoId);
      return columnas.map(c => {
        const valor = c.getValue(item, subcategoria, precio);
        if (valor == null) return '—';
        if (c.key.endsWith('Ars') || c.key === 'costoReposicion') return formatARS(String(valor));
        if (c.key.endsWith('Usd')) return formatUSD(String(valor));
        return c.label.endsWith('(%)') ? `${valor}%` : String(valor);
      });
    }),
    horizontalPageBreak: true,
    horizontalPageBreakRepeat: identificador >= 0 ? identificador : undefined,
    showHead: 'everyPage', theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [38, 85, 145], textColor: 255 },
    columnStyles: Object.fromEntries(columnas.map((c, i) => [i, {
      cellWidth: anchos[i],
      halign: c.key.endsWith('Ars') || c.key.endsWith('Usd') || c.key === 'costoReposicion' ? 'right' : 'left',
    }])),
  });
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page); doc.setFontSize(8);
    doc.text(`Página ${page} de ${total} · 1 USD = ARS ${formatARS(contexto?.cotizacion_usd_ars)} · ${contexto?.origen === 'SUCURSAL' ? 'propia' : 'general'}`, anchoPagina - MARGEN, altoPagina - 8, { align: 'right' });
  }
  return doc;
}
export function exportarListaPreciosPdf(items: StockItem[], selectedKeys: string[], sucursalNombre: string, getSubtipoNombre: (id: string) => string, contexto?: ContextoMonetario | null, precios?: PreciosSucursal) {
  crearPdfListaPrecios(items, selectedKeys, sucursalNombre, getSubtipoNombre, contexto, precios).save(`lista-precios-${sucursalNombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${fechaArchivoBuenosAires()}.pdf`);
}
