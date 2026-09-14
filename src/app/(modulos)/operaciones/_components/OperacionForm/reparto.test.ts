import { describe, it, expect } from 'vitest';
import { calcularReparto } from './reparto';
import { OperacionCuentaInput } from '../../../../../lib/types/OperacionCrear';

const fmt = (v: number) => `$${v.toFixed(2)}`;
/** c1 sin recargo, c2 con 10%. */
const extraDe = new Map([['c1', 0], ['c2', 10]]);

function evaluar(cuentas: OperacionCuentaInput[], base: number, opts = {}) {
  return calcularReparto({
    cuentas,
    modoReparto: 'monto',
    base,
    extraDe,
    requiereCuentas: true,
    formatMonto: fmt,
    ...opts,
  });
}

describe('calcularReparto — modo monto', () => {
  it('no valida un reparto sin cuentas cuando son obligatorias', () => {
    expect(evaluar([], 1000).valido).toBe(false);
  });

  it('no valida una fila sin cuenta seleccionada', () => {
    const r = evaluar([{ cuentaFinancieraId: '', montoArs: 1000 }], 1000);
    expect(r.valido).toBe(false);
    expect(r.mensajeError).toMatch(/cuenta financiera/i);
  });

  // CAS-52: el boton quedaba habilitado sin haber ingresado ningun monto.
  it('no valida una fila sin monto ingresado', () => {
    const r = evaluar([{ cuentaFinancieraId: 'c1', montoArs: undefined }], 1000);
    expect(r.valido).toBe(false);
    expect(r.mensajeError).toMatch(/Ingresá el monto/i);
  });

  it('no valida una fila sin monto aunque la base sea 0', () => {
    const r = evaluar([{ cuentaFinancieraId: 'c1', montoArs: undefined }], 0);
    expect(r.valido).toBe(false);
  });

  // CAS-52: el monto exacto debe habilitar el guardado.
  it('valida cuando el monto cubre exactamente la base', () => {
    const r = evaluar([{ cuentaFinancieraId: 'c1', montoArs: 1000 }], 1000);
    expect(r.mensajeError).toBeNull();
    expect(r.valido).toBe(true);
  });

  it('valida el monto con recargo incluido, igual que el backend', () => {
    // c2 tiene 10%: cobrar 1100 cubre una base de 1000.
    const r = evaluar([{ cuentaFinancieraId: 'c2', montoArs: 1100 }], 1000);
    expect(r.valido).toBe(true);
    expect(r.subtotalCubierto).toBe(1000);
    expect(r.totalRecargos).toBe(100);
    expect(r.totalFinal).toBe(1100);
  });

  it('reporta faltante y sobrante segun el signo de la diferencia', () => {
    expect(evaluar([{ cuentaFinancieraId: 'c1', montoArs: 400 }], 1000).mensajeError).toMatch(/Faltan/);
    expect(evaluar([{ cuentaFinancieraId: 'c1', montoArs: 1500 }], 1000).mensajeError).toMatch(/de más/);
  });

  it('reparte entre varias cuentas', () => {
    const r = evaluar(
      [
        { cuentaFinancieraId: 'c1', montoArs: 500 },
        { cuentaFinancieraId: 'c2', montoArs: 550 },
      ],
      1000
    );
    expect(r.valido).toBe(true);
    expect(r.totalFinal).toBe(1050);
  });

  it('no valida si la base no es un numero (descuento a medio tipear)', () => {
    const r = evaluar([{ cuentaFinancieraId: 'c1', montoArs: 1000 }], NaN);
    expect(r.valido).toBe(false);
  });
});

describe('calcularReparto — modo porcentaje', () => {
  const evaluarPct = (cuentas: OperacionCuentaInput[], base: number) =>
    calcularReparto({
      cuentas,
      modoReparto: 'porcentaje',
      base,
      extraDe,
      requiereCuentas: true,
      formatMonto: fmt,
    });

  it('exige que los porcentajes sumen 100', () => {
    const r = evaluarPct([{ cuentaFinancieraId: 'c1', porcentajeVenta: 60 }], 1000);
    expect(r.valido).toBe(false);
    expect(r.mensajeError).toMatch(/100%/);
  });

  it('valida y aplica el recargo sobre la parte asignada', () => {
    const r = evaluarPct(
      [
        { cuentaFinancieraId: 'c1', porcentajeVenta: 50 },
        { cuentaFinancieraId: 'c2', porcentajeVenta: 50 },
      ],
      1000
    );
    expect(r.valido).toBe(true);
    expect(r.filas[1].montoArs).toBe(550);
    expect(r.totalFinal).toBe(1050);
  });
});

describe('calcularReparto — movimientos (total derivado)', () => {
  const evaluarMov = (cuentas: OperacionCuentaInput[]) =>
    calcularReparto({
      cuentas,
      modoReparto: 'monto',
      base: 0,
      extraDe,
      derivarTotalDeCuentas: true,
      requiereCuentas: true,
      formatMonto: fmt,
    });

  it('no valida un movimiento en 0', () => {
    expect(evaluarMov([{ cuentaFinancieraId: 'c1', montoArs: 0 }]).valido).toBe(false);
  });

  it('valida un movimiento con monto positivo sin comparar contra una base', () => {
    const r = evaluarMov([{ cuentaFinancieraId: 'c1', montoArs: 2500 }]);
    expect(r.valido).toBe(true);
    expect(r.totalFinal).toBe(2500);
  });
});
