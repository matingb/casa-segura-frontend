import { describe, expect, it } from 'vitest';
import { calcularMargenVenta } from './margen-venta';

describe('Margen sobre el precio de venta', () => {
  it.each([
    [100, 60, 40],
    [150, 100, 33.33],
    [120, 60, 50],
    [100, 0, 100],
    [100, 100, 0],
    [80, 100, -25],
    ['0.30', '0.20', 33.33],
  ])('calcula venta %s y costo %s como %s%%', (precio, costo, esperado) => {
    expect(calcularMargenVenta(precio, costo)).toBe(esperado);
  });

  it.each([
    [0, 60], [null, 60], [100, null], [100, undefined], [100, ''], [100, ' '],
    [NaN, 60], [Infinity, 60], [100, 'inválido'], [-100, 60], [100, -60],
  ])('omite el margen con importes ausentes, inválidos o venta cero (%s, %s)', (precio, costo) => {
    expect(calcularMargenVenta(precio, costo)).toBeNull();
  });
});
