import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { operacionesClient } from '../../../../../lib/api/operaciones.client';
import { OperacionDetalle } from '../../../../../lib/types/OperacionDetalle';
import RegistrarImpactoStockModal from './RegistrarImpactoStockModal';

vi.mock('../../../../../lib/api/operaciones.client', () => ({
  operacionesClient: {
    registrarImpactoStock: vi.fn(),
  },
}));

const operacionPendiente: OperacionDetalle = {
  id: 'operacion-1',
  fecha: '2026-09-15T18:00:00.000Z',
  tipoId: 'tipo-compra',
  tipoNombre: 'Compra',
  usuarioNombre: 'Usuario',
  sucursalId: 'sucursal-1',
  sucursalNombre: 'Sucursal Centro',
  total: 0,
  items: [{
    id: 'detalle-1',
    productoId: 'producto-1',
    productoCodigo: 'CAM-1',
    productoNombre: 'Cámara',
    cantidad: 5,
    cantidadImpactadaStock: 3,
    cantidadPendienteStock: 2,
    ultimaModificacionStock: '2026-09-15T20:00:00.000Z',
    precioUnitario: 0,
    alicuotaIva: 0,
    iva: 0,
    subtotal: 0,
  }],
  cuentas: [],
};

describe('RegistrarImpactoStockModal', () => {
  it('bloquea el envío si se intenta registrar más unidades que las pendientes', () => {
    render(
      <RegistrarImpactoStockModal
        operacion={operacionPendiente}
        onClose={vi.fn()}
        onRegistered={vi.fn()}
      />
    );

    const input = screen.getByRole('spinbutton', { name: 'Cantidad a impactar de Cámara' });
    fireEvent.change(input, { target: { value: '3' } });

    expect(input).toHaveValue(3);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('no puede superar las 2 unidades pendientes');
    expect(screen.getByRole('button', { name: 'Registrar ingreso' })).toBeDisabled();
    expect(operacionesClient.registrarImpactoStock).not.toHaveBeenCalled();
  });
});
