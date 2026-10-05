import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExportacionCotizacion } from './useExportacionCotizacion';
const { guardar, actualizar } = vi.hoisted(() => ({ guardar: vi.fn(), actualizar: vi.fn(async () => {}) }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('../api/cotizacion.client', () => ({ cotizacionClient: { obtener: async () => ({ cotizacion_version: '4' }) } }));
function Formulario() {
  const { comprobar, dialogo } = useExportacionCotizacion();
  return <><button onClick={() => void comprobar({ contexto: { cotizacion_version: '3', cotizacion_usd_ars: '1200', actualizada_at: null }, conservar: guardar, actualizar })}>Exportar</button>{dialogo}</>;
}
describe('Exportación con cambio de dólar', () => {
  it('espera una elección explícita y permite conservar la vista anterior', async () => {
    render(<Formulario />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    await screen.findByRole('dialog', { name: 'Cambió la cotización de la lista' });
    expect(guardar).not.toHaveBeenCalled(); expect(actualizar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Conservar vista anterior' }));
    await waitFor(() => expect(guardar).toHaveBeenCalledOnce());
    expect(actualizar).not.toHaveBeenCalled();
  });
});
