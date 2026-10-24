import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar';

let mockPathname = '/productos';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mockPathname = '/productos';
  });

  it('renderiza todas las opciones de navegación con sus logos y enlaces', () => {
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: /productos/i })).toHaveAttribute('href', '/productos');
    expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/clientes');
    expect(screen.getByRole('link', { name: /stock por sucursal/i })).toHaveAttribute('href', '/stock');
    expect(screen.getByRole('link', { name: /lista de precios/i })).toHaveAttribute('href', '/lista-precios');
    expect(screen.getByRole('link', { name: /configuración/i })).toHaveAttribute('href', '/configuracion');
    expect(screen.getByRole('link', { name: /casasegura/i })).toHaveAttribute('href', '/productos');
  });

  it('marca la opción activa según el pathname actual', () => {
    mockPathname = '/stock';
    render(<Sidebar />);

    const stockLink = screen.getByRole('link', { name: /stock por sucursal/i });
    expect(stockLink.className).toMatch(/active/);

    const productosLink = screen.getByRole('link', { name: /productos/i });
    expect(productosLink.className).not.toMatch(/active/);
  });

  it('inicia colapsado por defecto, nunca desaparece y genera tooltips con el nombre de cada opción', () => {
    render(<Sidebar />);

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Los links siguen existiendo, siendo clickeables y navegables
    expect(screen.getByRole('link', { name: /productos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument();

    // Existen tooltips con el texto de cada opción para el hover
    const tooltips = screen.getAllByRole('tooltip');
    expect(tooltips.length).toBeGreaterThanOrEqual(4);
    expect(tooltips.some((el) => el.textContent === 'Productos')).toBe(true);
    expect(tooltips.some((el) => el.textContent === 'Clientes')).toBe(true);
    expect(tooltips.some((el) => el.textContent === 'Stock por sucursal')).toBe(true);
    expect(tooltips.some((el) => el.textContent === 'Lista de precios')).toBe(true);
  });

  it('permite conmutar entre colapsado y expandido con su propio botón interno', () => {
    render(<Sidebar />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');

    // Click en botón expandir interno
    const expandBtn = screen.getByRole('button', { name: /expandir barra lateral/i });
    fireEvent.click(expandBtn);
    expect(sidebar).toHaveAttribute('data-state', 'open');

    // Click en botón colapsar interno
    const collapseBtn = screen.getByRole('button', { name: /colapsar barra lateral/i });
    fireEvent.click(collapseBtn);
    expect(sidebar).toHaveAttribute('data-state', 'collapsed');
  });
});
