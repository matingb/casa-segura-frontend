import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Tooltip from './Tooltip';
import { nombreNivel, ordenarAportes, porcentajesDescuento } from '../../../lib/utils/niveles-descuento';

describe('Tooltip', () => {
  it('se muestra al pasar el mouse y se oculta al salir', () => {
    render(<Tooltip contenido="Región 2%"><span>2%</span></Tooltip>);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(screen.getByText('2%'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Región 2%');

    fireEvent.mouseLeave(screen.getByText('2%'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('se abre con el teclado, describe al disparador y se cierra con Escape', () => {
    render(<Tooltip contenido="Detalle"><span>3%</span></Tooltip>);
    const disparador = screen.getByText('3%').parentElement!;

    fireEvent.focus(disparador);
    const tooltip = screen.getByRole('tooltip');
    expect(disparador).toHaveAttribute('aria-describedby', tooltip.id);

    fireEvent.keyDown(disparador, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('se cierra al hacer scroll', () => {
    render(<Tooltip contenido="Detalle"><span>3%</span></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('3%'));
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('Porcentajes de descuento', () => {
  it('se muestran en orden producto, categoría, PDV y región', () => {
    const aportes = ordenarAportes([
      { nivel: 'sucursal', porcentaje: 5 },
      { nivel: 'categoria', porcentaje: 8 },
      { nivel: 'producto', porcentaje: 7 },
      { nivel: 'region-cliente', porcentaje: 2 },
    ]);
    expect(aportes.map((a) => a.nivel)).toEqual(['producto', 'categoria', 'sucursal', 'region-cliente']);
    expect(porcentajesDescuento(aportes)).toMatch(/^7\s?% \/ 8\s?% \/ 5\s?% \/ 2\s?%$/);
  });

  it('lista solo los porcentajes recibidos', () => {
    expect(porcentajesDescuento([
      { nivel: 'categoria', porcentaje: 8 },
      { nivel: 'region-cliente', porcentaje: 2 },
    ])).toMatch(/^8\s?% \/ 2\s?%$/);
    expect(porcentajesDescuento([])).toBe('');
    expect(nombreNivel('region-cliente')).toBe('Región');
  });
});
