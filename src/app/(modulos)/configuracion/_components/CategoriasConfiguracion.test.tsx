import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    renombrarTipo: vi.fn(),
    crearSubtipo: vi.fn(),
    eliminarSubtipo: vi.fn(),
    renombrarSubtipo: vi.fn(),
  },
}));

// Las sucursales de la empresa, incluida una a la que el usuario no está asignado.
vi.mock('../../../../lib/api/sucursal.client', () => ({
  sucursalClient: {
    obtenerParaAdmin: vi.fn().mockResolvedValue([
      { id: 'suc1', nombre: 'Casa Central', esCentral: true, valorDolar: 0, descuento: null, activo: true },
      { id: 'suc2', nombre: 'Sucursal Mendoza', esCentral: false, valorDolar: 0, descuento: null, activo: true },
    ]),
  },
}));

describe('CategoriasConfiguracion', () => {
  const mockTipos = [
    { id: 't1', nombre: 'Herramientas', descuentoGeneral: null, descuentosSucursal: [] },
    { id: 't2', nombre: 'Seguridad', descuentoGeneral: null, descuentosSucursal: [] },
  ];
  const mockSubtipos = [
    { id: 's1', tipoId: 't1', nombre: 'Manuales', descuentoGeneral: null, descuentosSucursal: [] },
    { id: 's2', tipoId: 't2', nombre: 'Candados', descuentoGeneral: null, descuentosSucursal: [] },
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
    vi.mocked(clasificacionClient.crearTipo).mockResolvedValue({ id: 't3', nombre: 'Iluminación', descuentoGeneral: null, descuentosSucursal: [] });

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
      descuentoGeneral: null,
      descuentosSucursal: [],
    });

    renderComponent();
    await screen.findByText('Herramientas');

    // Clic en "+ Subcategoría" en la tarjeta de Herramientas
    fireEvent.click(screen.getByLabelText('Agregar subcategoría a Herramientas'));

    const input = screen.getByPlaceholderText(/nombre de la subcategoría/i);
    fireEvent.change(input, { target: { value: 'Eléctricas' } });
    // El editor de descuentos tiene su propio "Guardar": buscamos el del formulario
    // de la subcategoría, que es el submit que acompaña a este input.
    const form = input.closest('form')!;
    fireEvent.click(within(form).getByRole('button', { name: /guardar/i }));

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

  it('permite renombrar una categoría', async () => {
    vi.mocked(clasificacionClient.renombrarTipo).mockResolvedValue();

    renderComponent();
    await screen.findByText('Herramientas');

    fireEvent.click(screen.getByLabelText('Editar categoría Herramientas'));
    const input = screen.getByLabelText('Nombre de la categoría');
    expect(input).toHaveValue('Herramientas');
    fireEvent.change(input, { target: { value: 'Herramientas eléctricas' } });
    fireEvent.click(within(input.closest('form')!).getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(clasificacionClient.renombrarTipo).toHaveBeenCalledWith('t1', 'Herramientas eléctricas');
    });
  });

  it('permite renombrar una subcategoría', async () => {
    vi.mocked(clasificacionClient.renombrarSubtipo).mockResolvedValue();

    renderComponent();
    await screen.findByText('Herramientas');
    fireEvent.click(screen.getByText('Herramientas'));
    await screen.findByText('Manuales');

    fireEvent.click(screen.getByLabelText('Editar subcategoría Manuales'));
    const input = screen.getByLabelText('Nombre de la subcategoría');
    fireEvent.change(input, { target: { value: 'Manuales pro' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(clasificacionClient.renombrarSubtipo).toHaveBeenCalledWith('s1', 'Manuales pro');
    });
  });

  it('ofrece todas las sucursales de la empresa para el descuento por sucursal', async () => {
    renderComponent();
    await screen.findByText('Herramientas');
    fireEvent.click(screen.getByText('Herramientas'));

    fireEvent.click(await screen.findByRole('button', { name: /agregar sucursal/i }));
    fireEvent.focus(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: 'Sucursal Mendoza' })).toBeInTheDocument();
  });
});
