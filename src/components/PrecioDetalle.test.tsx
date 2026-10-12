import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrecioDetalle from './PrecioDetalle';
const contexto = { cotizacion_usd_ars: '1200.000000', cotizacion_version: '3', actualizada_at: null };
describe('Detalle de precio de solo lectura', () => {
  it('informa principal, referencia y equivalente sin campos editables', () => {
    const { container } = render(<PrecioDetalle label="Precio base global" contexto={contexto} precio={{ moneda_referencia: 'USD', importe_referencia: '100.1234', ars: '120148.08', usd: '100.1234', estado: 'VINCULADO' }} />);
    expect(container.querySelector('input, select')).toBeNull();
    expect(screen.getByText('Referencia USD')).toBeInTheDocument();
    expect(screen.getByText('Equivalente ARS')).toBeInTheDocument();
    expect(screen.getByText(/versión 3/)).toBeInTheDocument();
  });
  it('señala un par heredado pendiente de revisión', () => {
    render(<PrecioDetalle label="Precio de sucursal" precio={{ moneda_referencia: 'ARS', importe_referencia: '100000.00', ars: '100000.00', usd: null, estado: 'LEGADO_PENDIENTE_REVISION' }} heredado={{ ars: '100000.00', usd: '120.1234' }} />);
    expect(screen.getByText(/pendiente de revisión/)).toBeInTheDocument();
  });
});
