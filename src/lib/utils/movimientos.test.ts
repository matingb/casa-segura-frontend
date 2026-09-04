import { describe, expect, it } from 'vitest';
import { esEgresoMovimiento, montoConSignoMovimiento } from './movimientos';

describe('movimientos de cuenta', () => {
  it('marca las salidas y les aplica signo negativo sin cambiar el valor almacenado', () => {
    expect(esEgresoMovimiento('egreso')).toBe(true);
    expect(esEgresoMovimiento('Compra')).toBe(true);
    expect(montoConSignoMovimiento(1250, 'egreso')).toBe(-1250);
  });

  it('mantiene positivos los ingresos', () => {
    expect(esEgresoMovimiento('ingreso')).toBe(false);
    expect(montoConSignoMovimiento(1250, 'ingreso')).toBe(1250);
  });
});
