import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatARS, formatUSD } from '../../../../../lib/utils/formatters';

export interface ItemListaCliente {
  codigo: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  subtipoNombre: string;
  precioListaArs: number;
  descuentoTotalPorcentaje: number;
  precioFinalArs: number;
  precioFinalUsd: number | null;
  iva?: number;
}

export interface DatosClienteExport {
  nombre: string;
  razonSocial?: string | null;
  nroDocumento?: string | null;
  descuentoHabitual?: number | null;
  regionNombre?: string | null;
  regionDescuento?: number | null;
}

function normalizarNombreArchivo(nombre: string) {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportarListaPreciosClientePdf(params: {
  items: ItemListaCliente[];
  cliente: DatosClienteExport;
  sucursalNombre: string;
}) {
  const { items, cliente, sucursalNombre } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const margenHorizontal = 14;

  // Encabezado
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text('Lista de Precios Personalizada', margenHorizontal, 15);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const clienteDetalle = [
    cliente.nombre,
    cliente.razonSocial ? `(${cliente.razonSocial})` : '',
    cliente.nroDocumento ? `Doc: ${cliente.nroDocumento}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  doc.text(`Cliente: ${clienteDetalle}`, margenHorizontal, 21);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const detallesRegionales: string[] = [
    `Punto de venta: ${sucursalNombre}`,
    `Fecha: ${fecha}`,
  ];
  if (cliente.regionNombre && cliente.regionDescuento != null) {
    detallesRegionales.push(`Región: ${cliente.regionNombre} (-${cliente.regionDescuento}%)`);
  }
  if (cliente.descuentoHabitual != null && cliente.descuentoHabitual > 0) {
    detallesRegionales.push(`Desc. habitual: ${cliente.descuentoHabitual}%`);
  }

  doc.text(detallesRegionales.join('  •  '), margenHorizontal, 26);

  // Tabla de productos y precios
  autoTable(doc, {
    startY: 30,
    margin: { top: 16, right: margenHorizontal, bottom: 16, left: margenHorizontal },
    head: [['Código', 'Producto', 'Categoría', 'Precio Lista', 'Descuento', 'Precio Cliente', 'Precio USD']],
    body: items.map((item) => [
      item.codigo,
      [item.nombre, item.marca, item.modelo].filter(Boolean).join(' - '),
      item.subtipoNombre,
      formatARS(item.precioListaArs),
      item.descuentoTotalPorcentaje > 0 ? `-${item.descuentoTotalPorcentaje.toFixed(1)}%` : '—',
      formatARS(item.precioFinalArs),
      item.precioFinalUsd != null ? formatUSD(item.precioFinalUsd) : '—',
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
      fillColor: [30, 64, 175], // Azul institucional
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 55 },
      2: { cellWidth: 32 },
      3: { cellWidth: 23, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'right' },
    },
  });

  // Pie de página
  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${pagina} de ${totalPaginas}  •  Precios sujetos a variación según políticas vigentes`,
      doc.internal.pageSize.getWidth() - margenHorizontal,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  const cliNombre = normalizarNombreArchivo(cliente.nombre) || 'cliente';
  const sucNombre = normalizarNombreArchivo(sucursalNombre) || 'sucursal';
  const fechaIso = new Date().toISOString().slice(0, 10);
  doc.save(`lista-precios-${cliNombre}-${sucNombre}-${fechaIso}.pdf`);
}
