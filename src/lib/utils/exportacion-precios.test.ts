import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { fechaArchivoBuenosAires, numeroExcel } from './exportacion-precios';
import { crearLibroListaPrecios } from '../../app/(modulos)/lista-precios/_lib/exportExcel';
import { crearPdfListaPrecios } from '../../app/(modulos)/lista-precios/_lib/exportPdf';
import { crearLibroListaPreciosCliente } from '../../app/(modulos)/clientes/_components/ClienteListaPreciosModal/exportExcelCliente';
import { crearPdfListaPreciosCliente } from '../../app/(modulos)/clientes/_components/ClienteListaPreciosModal/exportPdfCliente';
import { aFilaExportCliente, COLUMNAS_EXPORT_CLIENTE } from '../../app/(modulos)/clientes/_components/ClienteListaPreciosModal/columnasExportCliente';
import { StockItem } from '../types/Stock';
const contexto = { cotizacion_usd_ars: '1200.000000', cotizacion_version: '3', actualizada_at: '2026-10-04T18:00:00Z' };
const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i), nombre: `Producto ${i}`, codigo: `COD-${i}`, marca: '', modelo: '', subtipoId: 'st', precioVentaArs: i, precioVentaUsd: i === 0 ? null : 0.1234, iva: 21, contextoMonetario: contexto, precio: { moneda_referencia: 'ARS', importe_referencia: String(i), ars: String(i), usd: i === 0 ? null : '0.1234', estado: i === 0 ? 'LEGADO_PENDIENTE_REVISION' : 'VINCULADO' } })) as StockItem[];
describe('Archivos del catálogo', () => {
  it('exporta toda la selección y números USD precisos; ausencia queda vacía', () => {
    const libro = crearLibroListaPrecios(items, ['codigo', 'precioVentaArs', 'precioVentaUsd'], 'Centro', () => 'Subtipo', contexto);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets['Lista de precios']);
    expect(rows).toHaveLength(25);
    expect(rows[0]['Precio venta USD']).toBe('');
    expect(rows[1]['Precio venta USD']).toBe(0.1234);
    expect(libro.Sheets['Referencia']).toBeDefined();
    expect(JSON.stringify(libro.Sheets['Referencia'])).toContain('pendientes de confirmación');
    expect(crearPdfListaPrecios(items, 'Centro', () => 'Subtipo', contexto).getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
  it('rechaza mezclar versiones y usa la fecha de Buenos Aires', () => {
    expect(() => crearLibroListaPrecios([{ ...items[0], contextoMonetario: { ...contexto, cotizacion_version: '4' } }], ['codigo'], 'Centro', () => '', contexto)).toThrow('cotizaciones diferentes');
    expect(fechaArchivoBuenosAires(new Date('2026-10-05T01:00:00Z'))).toBe('2026-10-04');
    expect(numeroExcel('1234567890123456')).toBe('1234567890123456');
  });
  it('la lista por cliente exporta precio final y solo columnas de la lista blanca', () => {
    const item = { codigo: 'USD', nombre: 'Producto', marca: 'Marca', modelo: 'MD-1', subtipoNombre: 'Subtipo', precioListaArs: '120000.00', descuentoTotalPorcentaje: 10, precioFinalArs: '108000.00', precioFinalUsd: '90.0000', iva: 21, monedaReferencia: 'USD' as const, importeReferencia: '100.0000', importeFinalReferencia: '90.0000', estadoPrecio: 'LEGADO_PENDIENTE_REVISION' as const };
    // Aunque se pidan claves internas, no existen en la lista blanca y no salen.
    const columnas = ['codigo', 'nombre', 'precioClienteArs', 'precioClienteUsd', 'precioListaArs', 'descuentoTotalPorcentaje', 'costoReposicion', 'estadoPrecio'];
    const params = { filas: [aFilaExportCliente(item)], columnas, cliente: { nombre: 'Cliente' }, sucursalNombre: 'Centro', contexto };
    const libro = crearLibroListaPreciosCliente(params);
    const fila = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets['Lista de precios'])[0];
    expect(Object.keys(fila)).toEqual(['Código', 'Nombre', 'Precio cliente ARS', 'Precio cliente USD']);
    expect(fila).toMatchObject({ 'Precio cliente ARS': 108000, 'Precio cliente USD': 90 });
    const todo = JSON.stringify(libro.Sheets);
    for (const interno of ['120000', 'Descuento', 'Región', 'pendiente', 'LEGADO', 'Costo']) expect(todo).not.toContain(interno);
    expect(crearPdfListaPreciosCliente(params).getNumberOfPages()).toBe(1);
  });
  it('solo exporta las columnas elegidas, sin agregar ninguna por su cuenta', () => {
    const filas = [aFilaExportCliente({ codigo: 'A', nombre: 'Producto', subtipoNombre: '', precioListaArs: '10', descuentoTotalPorcentaje: 0, precioFinalArs: '10', precioFinalUsd: null })];
    const libro = crearLibroListaPreciosCliente({ filas, columnas: ['codigo'], cliente: { nombre: 'C' }, sucursalNombre: 'S', contexto });
    expect(Object.keys(XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets['Lista de precios'])[0])).toEqual(['Código']);
  });
  it('sin cotización no exporta USD y con muchas columnas el PDF va horizontal', () => {
    const sinDolar = { ...contexto, cotizacion_usd_ars: null };
    const filas = [aFilaExportCliente({ codigo: 'A', nombre: 'Producto', subtipoNombre: '', precioListaArs: '10', descuentoTotalPorcentaje: 0, precioFinalArs: '10', precioFinalUsd: null })];
    const libro = crearLibroListaPreciosCliente({ filas, columnas: ['nombre', 'precioClienteArs', 'precioClienteUsd'], cliente: { nombre: 'C' }, sucursalNombre: 'S', contexto: sinDolar });
    expect(Object.keys(XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets['Lista de precios'])[0])).toEqual(['Nombre', 'Precio cliente ARS']);
    const angosto = crearPdfListaPreciosCliente({ filas, columnas: ['codigo', 'nombre', 'marca', 'modelo', 'precioClienteArs'], cliente: { nombre: 'C' }, sucursalNombre: 'S', contexto });
    const ancho = crearPdfListaPreciosCliente({ filas, columnas: COLUMNAS_EXPORT_CLIENTE.map(c => c.key), cliente: { nombre: 'C' }, sucursalNombre: 'S', contexto });
    expect(angosto.internal.pageSize.getWidth()).toBeLessThan(ancho.internal.pageSize.getWidth());
  });
});
