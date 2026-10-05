import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PrecioEditor from './PrecioEditor';
import { PrecioEdicion } from '../lib/utils/precio';
const { contexto } = vi.hoisted(() => ({ contexto: { datos: { cotizacion_usd_ars: '1000.000000', cotizacion_version: '2', actualizada_at: null }, error: null, recargar: vi.fn() } }));
vi.mock('../context/CotizacionContext', () => ({ useCotizacion: () => contexto }));
function Formulario() {
  const [precio, setPrecio] = useState<PrecioEdicion>({ moneda: 'ARS', importe: '100000.00', contexto: { ...contexto.datos, cotizacion_version: '1' }, cambiado: true });
  return <PrecioEditor value={precio} onChange={setPrecio} />;
}
describe('Edición y adopción de referencias', () => {
  it('cambiar la moneda usa la cotización visible y mantiene pendiente su revisión', () => {
    const change = vi.fn();
    const anterior = { ...contexto.datos, cotizacion_usd_ars: '1200.000000', cotizacion_version: '1' };
    render(<PrecioEditor value={{ moneda: 'ARS', importe: '120000', contexto: anterior, cambiado: true }} onChange={change} />);
    fireEvent.change(screen.getByLabelText('Moneda de referencia'), { target: { value: 'USD' } });
    expect(change).toHaveBeenCalledWith({ moneda: 'USD', importe: '100.0000', contexto: anterior, cambiado: true });
  });
  it('conserva el principal ante conflicto y exige revisar la nueva cotización', async () => {
    contexto.recargar.mockResolvedValue(contexto.datos);
    render(<Formulario />);
    expect(screen.getByLabelText('Importe principal ARS')).toHaveValue(100000);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar cotización y revisar' }));
    await screen.findByText(/versión 2/);
    expect(screen.queryByRole('button', { name: 'Actualizar cotización y revisar' })).toBeNull();
    expect(screen.getByLabelText('Importe principal ARS')).toHaveValue(100000);
  });
  it('ofrece el USD original al elegir explícitamente la referencia de un par heredado', () => {
    const change = vi.fn();
    render(<PrecioEditor value={{ moneda: 'ARS', importe: '100000', contexto: contexto.datos, cambiado: false }} onChange={change} original={{ moneda_referencia: 'ARS', importe_referencia: '100000.00', ars: '100000.00', usd: '100.0000', estado: 'LEGADO_PENDIENTE_REVISION' }} heredado={{ ars: '100000.00', usd: '120.1234' }} />);
    fireEvent.change(screen.getByLabelText('Moneda de referencia'), { target: { value: 'USD' } });
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ moneda: 'USD', importe: '120.1234', cambiado: true }));
  });
});
