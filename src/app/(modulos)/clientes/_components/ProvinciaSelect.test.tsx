import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clienteClient } from '../../../../lib/api/cliente.client';
import ProvinciaSelect from './ProvinciaSelect';

vi.mock('../../../../lib/api/cliente.client', () => ({ clienteClient: { obtenerValoresUnicos: vi.fn() } }));
const opciones = ['Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Córdoba', 'Río Negro'];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clienteClient.obtenerValoresUnicos).mockResolvedValue(opciones);
});

describe('ProvinciaSelect', () => {
  it('ofrece un selector opcional y envía la provincia elegida en el formulario', async () => {
    const { container } = render(<form><ProvinciaSelect /></form>);
    await screen.findByRole('option', { name: 'Córdoba' });
    const selector = screen.getByRole('combobox', { name: 'Provincia' });
    expect(screen.queryByRole('textbox', { name: 'Provincia' })).not.toBeInTheDocument();
    expect(new FormData(container.querySelector('form')!).get('provincia')).toBe('');
    fireEvent.change(selector, { target: { value: 'Córdoba' } });
    expect(new FormData(container.querySelector('form')!).get('provincia')).toBe('Córdoba');
    expect(clienteClient.obtenerValoresUnicos).toHaveBeenCalledWith('provincia');
  });

  it('preserva el valor existente antes y después de cargar las opciones', async () => {
    let completar!: (opciones: string[]) => void;
    vi.mocked(clienteClient.obtenerValoresUnicos).mockReturnValue(new Promise((resolve) => { completar = resolve; }));
    render(<ProvinciaSelect valorAnterior="Córdoba" />);
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveValue('Córdoba');
    completar(opciones);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveAttribute('aria-busy', 'false'));
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveValue('Córdoba');
  });

  it('muestra el dato histórico y permite reemplazarlo sin inventar una provincia', async () => {
    const { container } = render(<form><ProvinciaSelect valorAnterior="Valor histórico" /></form>);
    expect(await screen.findByRole('option', { name: 'Valor histórico (valor anterior)' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveValue('Valor histórico');
    expect(new FormData(container.querySelector('form')!).get('provincia')).toBe('Valor histórico');
    fireEvent.change(screen.getByRole('combobox', { name: 'Provincia' }), { target: { value: 'Río Negro' } });
    expect(screen.queryByText(/El valor anterior no coincide/)).not.toBeInTheDocument();
  });

  it('permite reintentar una carga fallida y conserva el dato actual', async () => {
    vi.mocked(clienteClient.obtenerValoresUnicos).mockRejectedValueOnce(new Error('Error de conexión'));
    render(<ProvinciaSelect valorAnterior="Córdoba" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión');
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveValue('Córdoba');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByRole('option', { name: 'Río Negro' });
    expect(screen.getByRole('combobox', { name: 'Provincia' })).toHaveValue('Córdoba');
  });
});
