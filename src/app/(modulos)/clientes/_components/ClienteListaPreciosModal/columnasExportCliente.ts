import { ItemListaCliente } from '../../../../../lib/types/ListaPreciosCliente';
import { ColumnaExportable } from '../../../../../components/ExportarColumnasModal/ExportarColumnasModal';
import { formatARS, formatUSD } from '../../../../../lib/utils/formatters';
import { numeroExcel } from '../../../../../lib/utils/exportacion-precios';

/**
 * Lista blanca de lo que puede salir en un archivo que se le envía al cliente.
 * Precio de lista, descuentos, costos, márgenes, stock y estados internos no
 * existen en FilaExportCliente: los generadores de archivo solo reciben esto.
 */
export interface FilaExportCliente {
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  categoria: string;
  precioClienteArs: number | string | null;
  precioClienteUsd: number | string | null;
  iva: number | string | null;
}

export function aFilaExportCliente(item: ItemListaCliente): FilaExportCliente {
  return {
    codigo: item.codigo,
    nombre: item.nombre,
    marca: item.marca ?? '',
    modelo: item.modelo ?? '',
    categoria: item.subtipoNombre ?? '',
    precioClienteArs: item.precioFinalArs,
    precioClienteUsd: item.precioFinalUsd,
    iva: item.iva ?? null,
  };
}

export type ClaveColumnaCliente = keyof FilaExportCliente;

interface DefinicionColumna {
  key: ClaveColumnaCliente;
  label: string;
  grupo: 'Producto' | 'Precios';
  /** Ancho aproximado en el PDF (mm). El nombre se estira con el espacio que sobra. */
  anchoPdf: number;
  numerica?: boolean;
  excel: (fila: FilaExportCliente) => string | number;
  pdf: (fila: FilaExportCliente) => string;
}

export const COLUMNAS_EXPORT_CLIENTE: DefinicionColumna[] = [
  { key: 'codigo', label: 'Código', grupo: 'Producto', anchoPdf: 24, excel: f => f.codigo, pdf: f => f.codigo },
  { key: 'nombre', label: 'Nombre', grupo: 'Producto', anchoPdf: 60, excel: f => f.nombre, pdf: f => f.nombre },
  { key: 'marca', label: 'Marca', grupo: 'Producto', anchoPdf: 28, excel: f => f.marca, pdf: f => f.marca },
  { key: 'modelo', label: 'Modelo', grupo: 'Producto', anchoPdf: 30, excel: f => f.modelo, pdf: f => f.modelo },
  { key: 'categoria', label: 'Categoría', grupo: 'Producto', anchoPdf: 32, excel: f => f.categoria, pdf: f => f.categoria },
  { key: 'precioClienteArs', label: 'Precio cliente ARS', grupo: 'Precios', anchoPdf: 30, numerica: true,
    excel: f => numeroExcel(f.precioClienteArs), pdf: f => formatARS(f.precioClienteArs) },
  { key: 'precioClienteUsd', label: 'Precio cliente USD', grupo: 'Precios', anchoPdf: 30, numerica: true,
    excel: f => numeroExcel(f.precioClienteUsd), pdf: f => f.precioClienteUsd == null ? '' : formatUSD(f.precioClienteUsd) },
  { key: 'iva', label: 'IVA (%)', grupo: 'Precios', anchoPdf: 16, numerica: true,
    excel: f => numeroExcel(f.iva), pdf: f => f.iva == null ? '' : `${f.iva}%` },
];

export function columnasElegiblesCliente(hayCotizacion: boolean): ColumnaExportable[] {
  return COLUMNAS_EXPORT_CLIENTE.map(c => ({
    key: c.key, label: c.label, grupo: c.grupo,
    noDisponible: c.key === 'precioClienteUsd' && !hayCotizacion ? 'Configurá la cotización del dólar para incluirla' : undefined,
  }));
}

/** Devuelve solo columnas de la lista blanca, en su orden. */
export function resolverColumnasCliente(claves: readonly string[], hayCotizacion: boolean): DefinicionColumna[] {
  return COLUMNAS_EXPORT_CLIENTE.filter(c => claves.includes(c.key) && (c.key !== 'precioClienteUsd' || hayCotizacion));
}
