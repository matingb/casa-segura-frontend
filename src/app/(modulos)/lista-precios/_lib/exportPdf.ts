import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { StockItem } from '../../../../lib/types/Stock';
import { formatARS, formatUSD } from '../../../../lib/utils/formatters';

function normalizarNombreArchivo(nombre: string) {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportarListaPreciosPdf(
  items: StockItem[],
  sucursalNombre: string,
  getSubtipoNombre: (subtipoId: string) => string
) {
  const documento = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const fecha = new Date().toISOString().slice(0, 10);
  const margenHorizontal = 16;

  documento.setFontSize(16);
  documento.text('Lista de precios', margenHorizontal, 16);
  documento.setFontSize(9);
  documento.setTextColor(90);
  documento.text(`Sucursal: ${sucursalNombre}`, margenHorizontal, 22);
  documento.text(`Generada: ${fecha}`, margenHorizontal, 27);
  documento.setTextColor(0);

  autoTable(documento, {
    startY: 32,
    margin: { top: 16, right: margenHorizontal, bottom: 16, left: margenHorizontal },
    head: [['Codigo', 'Producto', 'Subtipo', 'Precio ARS', 'Precio USD', 'IVA']],
    body: items.map((item) => [
      item.codigo,
      [item.nombre, item.marca, item.modelo].filter(Boolean).join('\n'),
      getSubtipoNombre(item.subtipoId),
      formatARS(item.precioVentaArs),
      formatUSD(item.precioVentaUsd),
      `${item.iva}%`,
    ]),
    showHead: 'everyPage',
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [38, 85, 145],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 57 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 23, halign: 'right' },
      5: { cellWidth: 14, halign: 'right' },
    },
  });

  const totalPaginas = documento.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    documento.setPage(pagina);
    documento.setFontSize(8);
    documento.setTextColor(90);
    documento.text(
      `Pagina ${pagina} de ${totalPaginas}`,
      documento.internal.pageSize.getWidth() - margenHorizontal,
      documento.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  const sucursalArchivo = normalizarNombreArchivo(sucursalNombre) || 'sucursal';
  documento.save(`lista-precios-${sucursalArchivo}-${fecha}.pdf`);
}
