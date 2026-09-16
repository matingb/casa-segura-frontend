import { describe, expect, it } from 'vitest';
import { mapApiOperacionDetalleToOperacionDetalle, mapOperacionCrearInputToApiBody } from './operaciones.client';

describe('operacionesClient CAS-48 mapping', () => {
  it('envía el impacto inicial por línea, sin un interruptor global de stock', () => {
    const body = mapOperacionCrearInputToApiBody({
      tipo: 'compra',
      sucursalId: 'sucursal-1',
      registrarFinanzasAhora: true,
      modoReparto: 'monto',
      items: [{ productoSucursalId: 'stock-1', cantidad: 3, cantidadImpactadaStock: 0 }],
      cuentas: [{ cuentaFinancieraId: 'cuenta-1', montoArs: 100 }],
      compra: { proveedorId: 'proveedor-1', totalArs: 100 },
    });

    expect(body).toMatchObject({
      registrar_finanzas_ahora: true,
      items: [{
        producto_sucursal_id: 'stock-1',
        cantidad: 3,
        cantidad_impactada_stock: 0,
      }],
    });
    expect(body).not.toHaveProperty('impactar_stock_ahora');
  });

  it('deriva el progreso de stock por línea y conserva el estado físico', () => {
    const operacion = mapApiOperacionDetalleToOperacionDetalle({
      id: 'op-1',
      tipo_nombre: 'Venta',
      estado_stock: 'PARCIAL',
      items: [{
        id: 'detalle-1',
        cantidad: 10,
        cantidad_impactada_stock: 4,
        ultima_modificacion_stock_at: '2026-09-15T20:00:00.000Z',
        producto_nombre: 'Cámara',
      }],
      cuentas: [],
    });

    expect(operacion.estadoStock).toBe('PARCIAL');
    expect(operacion.items[0]).toMatchObject({
      cantidad: 10,
      cantidadImpactadaStock: 4,
      cantidadPendienteStock: 6,
      ultimaModificacionStock: '2026-09-15T20:00:00.000Z',
    });
  });
});
