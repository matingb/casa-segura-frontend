import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CeldaMargen from './CeldaMargen';

describe('CeldaMargen', () => {
  it('calcula el margen a partir de los importes en pesos', () => {
    render(<CeldaMargen precioArs="150.00" costoArs="100.00" />);
    expect(screen.getByText('33,33%')).toBeInTheDocument();
  });

  it('permite calcular en USD cuando no hay conversión a pesos', () => {
    render(<CeldaMargen precioUsd="10.0000" costoUsd="6.0000" />);
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('omite el cálculo si los importes disponibles son de monedas distintas', () => {
    render(<CeldaMargen precioUsd="10.0000" costoArs="6000.00" />);
    expect(screen.getByText('—')).toHaveAttribute('title', expect.stringContaining('misma moneda'));
  });

  it('conserva un margen negativo cuando el precio queda por debajo del costo', () => {
    render(<CeldaMargen precioArs={80} costoArs={100} />);
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });
});
