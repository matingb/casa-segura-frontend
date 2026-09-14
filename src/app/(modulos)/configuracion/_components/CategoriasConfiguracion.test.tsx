import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoriasConfiguracion from './CategoriasConfiguracion';
import { clasificacionClient } from '../../../../lib/api/clasificacion.client';
import { ToastProvider } from '../../../../context/ToastContext';

vi.mock('../../../../lib/api/clasificacion.client', () => ({
  clasificacionClient: {
    obtenerTipos: vi.fn(),
    obtenerSubtipos: vi.fn(),
    crearTipo: vi.fn(),
    eliminarTipo: vi.fn(),
    crearSubtipo: vi.fn(),
    eliminarSubtipo: vi.fn(),
  },
}));

describe('CategoriasConfiguracion', () => {
  const mockTipos = [
    { id: 't1', nombre: 'Herramientas' },
    { id: 't2', nombre: 'Seguridad' },
  ];
  const mockSubtipos = [
    { id: 's1', tipoId: 't1', nombre: 'Manuales' },
    { id: 's2', tipoId: 't2', nombre: 'Candados' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clasificacionClient.obtenerTipos).mockResolvedValue(mockTipos);
    vi.mocked(clasificacionClient.obtenerSubtipos).mockResolvedValue(mockSubtipos);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <CategoriasConfiguracion />
      </ToastProvider>
    );

  it('renderiza la lista de categorías y sus cantidades', async () => {
    renderComponent();

    expect(await screen.findByText('Herramientas')).toBeInTheDocument();
    expect(screen.getByText('Seguridad')).toBeInTheDocument();
    expect(screen.getAllByText('1 subcategoría').length).toBe(2);
  });

  it('permite desplegar una categoría para ver sus subcategorías', async () => {
    renderComponent();

    await screen.findByText('Herramientas');
    expect(screen.queryByText('Manuales')).not.toBeInTheDocument();

    // Clic en la fila de la categoría para expandir
    fireEvent.click(screen.getByText('Herramientas'));

    expect(await screen.findByText('Manuales')).toBeInTheDocument();
  });

  it('permite crear una nueva categoría', async () => {
    vi.mocked(clasificacionClient.crearTipo).mockResolvedValue({ id: 't3', nombre: 'Iluminación' });

    renderComponent();
    await screen.findByText('Herramientas');

    // Clic en el botón superior "+ Nueva categoría"
    fireEvent.click(screen.getByRole('button', { name: /nueva categoría/i }));

    const input = screen.getByPlaceholderText(/nombre de la categoría/i);
    fireEvent.change(input, { target: { value: 'Iluminación' } });
    fireEvent.click(screen.getByRole('button', { name: /crear categoría/i }));

    await waitFor(() => {
      expect(clasificacionClient.crearTipo).toHaveBeenCalledWith('Iluminación');
    });
  });

  it('permite eliminar una categoría con confirmación', async () => {
    vi.mocked(clasificacionClient.eliminarTipo).mockResolvedValue();

    renderComponent();
    await screen.findByText('Herramientas');

    const deleteBtn = screen.getByLabelText('Eliminar categoría Herramientas');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(clasificacionClient.eliminarTipo).toHaveBeenCalledWith('t1');
    });
  });

  it('permite agregar una subcategoría a una categoría', async () => {
    vi.mocked(clasificacionClient.crearSubtipo).mockResolvedValue({
      id: 's3',
      tipoId: 't1',
      nombre: 'Eléctricas',
    });

    renderComponent();
    await screen.findByText('Herramientas');

    // Clic en "+ Subcategoría" en la tarjeta de Herramientas
    fireEvent.click(screen.getByLabelText('Agregar subcategoría a Herramientas'));

    const input = screen.getByPlaceholderText(/nombre de la subcategoría/i);
    fireEvent.change(input, { target: { value: 'Eléctricas' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(clasificacionClient.crearSubtipo).toHaveBeenCalledWith('t1', 'Eléctricas');
    });
  });

  it('permite eliminar una subcategoría con confirmación', async () => {
    vi.mocked(clasificacionClient.eliminarSubtipo).mockResolvedValue();

    renderComponent();
    await screen.findByText('Herramientas');
    fireEvent.click(screen.getByText('Herramientas'));

    await screen.findByText('Manuales');

    const deleteSubBtn = screen.getByLabelText('Eliminar subcategoría Manuales');
    fireEvent.click(deleteSubBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(clasificacionClient.eliminarSubtipo).toHaveBeenCalledWith('s1');
    });
  });
});
