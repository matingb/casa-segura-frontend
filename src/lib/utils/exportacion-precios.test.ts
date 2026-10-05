import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { fechaArchivoBuenosAires, numeroExcel } from './exportacion-precios';
import { crearLibroListaPrecios } from '../../app/(modulos)/lista-precios/_lib/exportExcel';
import { crearPdfListaPrecios } from '../../app/(modulos)/lista-precios/_lib/exportPdf';
import { crearLibroListaPreciosCliente } from '../../app/(modulos)/clientes/_components/ClienteListaPreciosModal/exportExcelCliente';
import { crearPdfListaPreciosCliente } from '../../app/(modulos)/clientes/_components/ClienteListaPreciosModal/exportPdfCliente';
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
  it('la lista por cliente conserva precio final y principal en PDF y Excel', () => {
    const params = { items: [{ codigo: 'USD', nombre: 'Producto', subtipoNombre: 'Subtipo', precioListaArs: '120000.00', descuentoTotalPorcentaje: 10, precioFinalArs: '108000.00', precioFinalUsd: '90.0000', monedaReferencia: 'USD' as const, importeReferencia: '100.0000', importeFinalReferencia: '90.0000' }], cliente: { nombre: 'Cliente' }, sucursalNombre: 'Centro', contexto };
    const libro = crearLibroListaPreciosCliente(params);
    expect(XLSX.utils.sheet_to_json(libro.Sheets['Lista de Precios'])[0]).toMatchObject({ 'Precio Final ARS': 108000, 'Precio Final USD': 90, 'Importe final principal': 90 });
    expect(crearPdfListaPreciosCliente(params).getNumberOfPages()).toBe(1);
  });
});
