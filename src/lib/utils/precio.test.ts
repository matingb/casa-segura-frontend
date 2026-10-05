import { describe, expect, it } from 'vitest';
import { precioParaGuardar, resolverPrecioVista } from './precio';
import { mapApiProductoSucursalToStockItem } from '../api/stock.client';
const cotizacion = { cotizacion_usd_ars: '1200.000000', cotizacion_version: '3', actualizada_at: null };
describe('Contrato monetario del formulario', () => {
  it('conserva cuatro decimales USD y cero', () => {
    expect(resolverPrecioVista('USD', '0.1234', cotizacion)).toMatchObject({ usd: '0.1234', ars: '148.08' });
    expect(resolverPrecioVista('ARS', '0', cotizacion)).toMatchObject({ ars: '0.00', usd: '0.0000' });
  });
  it('permite omitir el precio en ediciones no monetarias sin dólar', () => {
    expect(precioParaGuardar({ moneda: 'ARS', importe: '100', contexto: null, cambiado: false }, null)).toBeUndefined();
    expect(precioParaGuardar({ moneda: 'ARS', importe: '', contexto: null, cambiado: true }, null)).toBeNull();
  });
  it('requiere revisar un cambio de versión y no muta el importe', () => {
    const edicion = { moneda: 'USD' as const, importe: '0.1234', contexto: cotizacion, cambiado: true };
    expect(() => precioParaGuardar(edicion, { ...cotizacion, cotizacion_version: '4' })).toThrow('Cambió');
    expect(edicion.importe).toBe('0.1234');
    expect(precioParaGuardar(edicion, cotizacion)).toEqual({ moneda_referencia: 'USD', importe_referencia: '0.1234', cotizacion_version: '3' });
  });
  it('conserva precios ausentes y usa el equivalente resuelto, aunque el persistido sea viejo', () => {
    const item = mapApiProductoSucursalToStockItem({ precio_venta_ars: '100000', precio_venta_usd: '120', habilitado: true, producto_activo: true, precio_resuelto: { moneda_referencia: 'USD', importe_referencia: '100.0000', ars: '120000.00', usd: '100.0000', estado: 'VINCULADO' } });
    expect(item.precioVentaArs).toBe(120000);
    expect(item.precioVentaUsd).toBe(100);
    expect(mapApiProductoSucursalToStockItem({}).precioVentaArs).toBeNull();
    expect(mapApiProductoSucursalToStockItem({ precio_venta_ars: '0', iva: '0' })).toMatchObject({ precioVentaArs: 0, iva: 0 });
  });
});
