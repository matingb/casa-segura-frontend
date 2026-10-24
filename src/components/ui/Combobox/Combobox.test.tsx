import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Building2 } from 'lucide-react';
import Combobox from './Combobox';

describe('Combobox', () => {
  const options = [
    { value: 'suc-1', label: 'Casa Central' },
    { value: 'suc-2', label: 'Norte' },
  ];

  it('permite abrir y cerrar el dropdown haciendo click arriba sucesivamente', () => {
    const handleChange = vi.fn();
    render(
      <Combobox
        options={options}
        value="suc-1"
        onChange={handleChange}
        placeholder="Sucursal"
      />
    );

    const input = screen.getByRole('combobox');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // 1er click: se abre el dropdown
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // 2do click arriba en el input: se vuelve a cerrar
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // 3er click: se vuelve a abrir
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('cierra el dropdown al hacer click fuera', () => {
    render(
      <div>
        <span data-testid="outside">Afuera</span>
        <Combobox
          options={options}
          value="suc-1"
          onChange={vi.fn()}
        />
      </div>
    );

    const input = screen.getByRole('combobox');
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click afuera
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('permite seleccionar una opción y se cierra automáticamente', () => {
    const handleChange = vi.fn();
    render(
      <Combobox
        options={options}
        value="suc-1"
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    fireEvent.mouseDown(input);
    fireEvent.click(input);

    const option = screen.getByRole('option', { name: 'Norte' });
    fireEvent.mouseDown(option);

    expect(handleChange).toHaveBeenCalledWith('suc-2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renderiza el icono dentro del input cuando es provisto', () => {
    render(
      <Combobox
        icon={<Building2 data-testid="combobox-icon" size={15} />}
        options={options}
        value="suc-1"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('combobox-icon')).toBeInTheDocument();
  });
});
