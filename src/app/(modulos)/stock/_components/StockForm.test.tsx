import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StockForm from './StockForm';
import { stockClient } from '../../../../lib/api/stock.client';
import { StockItem } from '../../../../lib/types/Stock';
const { cotizacion, toast, push } = vi.hoisted(() => ({ cotizacion: { cotizacion_usd_ars: '1000.000000', cotizacion_version: '3', actualizada_at: null }, toast: { showError: vi.fn(), showSuccess: vi.fn() }, push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => toast }));
vi.mock('../../../../context/CotizacionContext', () => ({ useCotizacion: () => ({ datos: cotizacion, recargar: vi.fn(), error: null }) }));
vi.mock('../../../../context/SucursalContext', () => ({ useSucursales: () => ({ sucursales: [] }) }));
vi.mock('../../../../lib/hooks/useClasificacion', () => ({ useClasificacion: () => ({ getSubtipoNombre: () => 'Subtipo' }) }));
vi.mock('../_hooks/useStockDetalle', () => ({ useStockDetalle: () => ({ stockItem: null, isLoading: false, error: null, reload: vi.fn() }) }));
vi.mock('../../../../lib/api/stock.client', () => ({ stockClient: { actualizar: vi.fn() } }));
const item = { id: 'stock-1', productoId: 'p1', sucursalNombre: 'Centro', nombre: 'Producto', codigo: 'P1', costoReposicion: 1, margenMinimo: 10, iva: 21, activo: true, stockMinimo: 2, cantidadDisponible: 42, cantidadReservada: 3, precioVentaArs: 123.4, precioVentaUsd: 0.1234, contextoMonetario: cotizacion, precio: { moneda_referencia: 'USD', importe_referencia: '0.1234', ars: '123.40', usd: '0.1234', estado: 'VINCULADO' } } as StockItem;
describe('Guardado del precio de sucursal', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(stockClient.actualizar).mockResolvedValue(item); });
  it('manda un único principal preciso y omite cantidades sin editar', async () => {
    render(<StockForm title="Editar" stockItem={item} />);
    fireEvent.change(screen.getByLabelText('Importe principal USD'), { target: { value: '0.1235' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(stockClient.actualizar).toHaveBeenCalled());
    const payload = vi.mocked(stockClient.actualizar).mock.calls[0][1];
    expect(payload.precio).toEqual({ moneda_referencia: 'USD', importe_referencia: '0.1235', cotizacion_version: '3' });
    expect(payload).not.toHaveProperty('cantidad_disponible');
    expect(payload).not.toHaveProperty('cantidad_reservada');
    expect(payload).not.toHaveProperty('precio_venta_ars');
  });
  it('incluye solamente la cantidad que el usuario corrigió', async () => {
    render(<StockForm title="Editar" stockItem={item} />);
    fireEvent.change(screen.getByLabelText('Cantidad disponible'), { target: { value: '43' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(stockClient.actualizar).toHaveBeenCalled());
    const payload = vi.mocked(stockClient.actualizar).mock.calls[0][1];
    expect(payload.cantidad_disponible).toBe(43);
    expect(payload).not.toHaveProperty('cantidad_reservada');
    expect(payload).not.toHaveProperty('precio');
  });
});
