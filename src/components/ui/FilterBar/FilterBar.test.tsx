import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FilterBar, { FilterField } from './FilterBar';

describe('FilterBar', () => {
  const fields: FilterField[] = [
    { key: 'marca', label: 'Marca' },
    { key: 'modelo', label: 'Modelo' },
  ];

  const filterOptions = {
    marca: [
      { value: 'hikvision', label: 'Hikvision' },
      { value: 'dahua', label: 'Dahua' },
    ],
  };

  it('renderiza la barra de búsqueda, el slot children en el medio y el botón de filtros', () => {
    const handleFilterChange = vi.fn();
    const handleSearchChange = vi.fn();

    render(
      <FilterBar
        search="camara"
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar por código o nombre..."
        fields={fields}
        filters={{ marca: '' }}
        onFilterChange={handleFilterChange}
        filterOptions={filterOptions}
      >
        <div data-testid="custom-dropdown">Dropdown Sucursal</div>
      </FilterBar>
    );

    // 1. Filtro por texto
    expect(screen.getByPlaceholderText('Buscar por código o nombre...')).toHaveValue('camara');

    // 2. Elemento children posicionado en la barra
    expect(screen.getByTestId('custom-dropdown')).toBeInTheDocument();

    // 3. Botón de filtros para el panel desplegable
    const filterBtn = screen.getByRole('button', { name: /filtros/i });
    expect(filterBtn).toBeInTheDocument();

    // El panel de filtros inicia cerrado
    expect(screen.queryByPlaceholderText('Buscar marca...')).not.toBeInTheDocument();
  });

  it('abre el panel de filtros al hacer click en el botón de filtros', () => {
    render(
      <FilterBar
        search=""
        onSearchChange={vi.fn()}
        fields={fields}
        filters={{ marca: '' }}
        onFilterChange={vi.fn()}
        filterOptions={filterOptions}
      />
    );

    const filterBtn = screen.getByRole('button', { name: /filtros/i });
    fireEvent.click(filterBtn);

    expect(screen.getByText('Marca')).toBeInTheDocument();
    expect(screen.getByText('Modelo')).toBeInTheDocument();
  });

  it('muestra chips para filtros activos y permite limpiarlos', () => {
    const handleFilterChange = vi.fn();
    const handleSearchChange = vi.fn();

    render(
      <FilterBar
        search="test"
        onSearchChange={handleSearchChange}
        fields={fields}
        filters={{ marca: 'hikvision' }}
        onFilterChange={handleFilterChange}
        filterOptions={filterOptions}
      />
    );

    // Chip de marca activa
    expect(screen.getByText('Marca: Hikvision')).toBeInTheDocument();

    // Click en limpiar filtros
    const clearBtn = screen.getByRole('button', { name: /limpiar filtros/i });
    fireEvent.click(clearBtn);

    expect(handleFilterChange).toHaveBeenCalledWith('marca', '');
    expect(handleSearchChange).toHaveBeenCalledWith('');
  });
});
