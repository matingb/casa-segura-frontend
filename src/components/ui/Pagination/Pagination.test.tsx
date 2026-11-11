import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination';

function paginasVisibles() {
  return screen.getAllByRole('button').map((button) => button.textContent ?? '').filter((text) => /^\d+$/.test(text)).map(Number);
}

describe('Pagination', () => {
  it.each([1, 3, 8, 14, 15])('muestra diez páginas, incluida la actual, al estar en la página %i de 15', (page) => {
    render(<Pagination page={page} totalPages={15} onPageChange={vi.fn()} />);
    const paginas = paginasVisibles();
    expect(paginas).toHaveLength(10);
    expect(new Set(paginas).size).toBe(10);
    expect(paginas[0]).toBe(1);
    expect(paginas.at(-1)).toBe(15);
    expect(screen.getByRole('button', { name: String(page) })).toHaveAttribute('aria-current', 'page');
  });

  it.each([2, 5, 10])('muestra todas las páginas cuando hay %i', (totalPages) => {
    render(<Pagination page={1} totalPages={totalPages} onPageChange={vi.fn()} />);
    expect(paginasVisibles()).toEqual(Array.from({ length: totalPages }, (_, index) => index + 1));
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('permite saltar a una de las páginas agregadas', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} totalPages={15} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    expect(onPageChange).toHaveBeenCalledWith(8);
  });

  it('deshabilita todos los botones durante la carga', () => {
    render(<Pagination page={3} totalPages={15} onPageChange={vi.fn()} disabled />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });
});
