import { describe, it, expect } from 'vitest';
import {
  calcularPago,
  validarPago,
  aCuentasInput,
  repartirEnPartesIguales,
  filasInicialesDivididas,
  maximoParaFila,
  maximoPorcentajeParaFila,
  aplicarPoliticaExceso,
  baseAPorcentaje,
  porcentajeABase,
  FilaPago,
} from './pago';

/** efectivo sin recargo, tarjeta con 10%, débito con 3.5%. */
const tasaDe = new Map([
  ['efectivo', 0],
  ['tarjeta', 10],
  ['debito', 3.5],
]);

describe('calcularPago — una sola cuenta', () => {
  it('asigna toda la mercadería a la cuenta elegida', () => {
    const r = calcularPago(78600, [{ cuentaFinancieraId: 'efectivo' }], tasaDe, 'unica');

    expect(r.filas).toHaveLength(1);
    expect(r.filas[0].baseArs).toBe(78600);
    expect(r.mercaderia).toBe(78600);
    expect(r.recargos).toBe(0);
    expect(r.total).toBe(78600);
  });

  it('aplica el recargo sobre el total cuando la cuenta lo tiene', () => {
    const r = calcularPago(78600, [{ cuentaFinancieraId: 'tarjeta' }], tasaDe, 'unica');

    expect(r.recargos).toBe(7860);
    expect(r.total).toBe(86460);
    expect(r.filas[0].debitaArs).toBe(86460);
  });

  it('no rompe si todavía no se eligió cuenta', () => {
    const r = calcularPago(78600, [], tasaDe, 'unica');

    expect(r.filas).toHaveLength(0);
    expect(r.total).toBe(78600);
  });
});

describe('calcularPago — dividido', () => {
  // Ejemplo de la especificación: 78.600 en 50.000 efectivo (0%) + 28.600 tarjeta (10%).
  it('resuelve el caso de referencia: 78.600 → recargo 2.860 → total 81.460', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 50000 },
      { cuentaFinancieraId: 'tarjeta' },
    ];

    const r = calcularPago(78600, filas, tasaDe, 'dividido');

    expect(r.filas[0].baseArs).toBe(50000);
    expect(r.filas[0].recargoArs).toBe(0);
    expect(r.filas[1].baseArs).toBe(28600);
    expect(r.filas[1].recargoArs).toBe(2860);
    expect(r.filas[1].debitaArs).toBe(31460);
    expect(r.mercaderia).toBe(78600);
    expect(r.recargos).toBe(2860);
    expect(r.total).toBe(81460);
  });

  it('la última fila absorbe el resto y cierra en cero', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 30000 },
      { cuentaFinancieraId: 'debito', baseArs: 20000 },
      { cuentaFinancieraId: 'tarjeta' },
    ];

    const r = calcularPago(78600, filas, tasaDe, 'dividido');
    const sumaBases = r.filas.reduce((acc, f) => acc + f.baseArs, 0);

    expect(sumaBases).toBe(78600);
    expect(r.filas[2].baseArs).toBe(28600);
    expect(r.filas[2].esResto).toBe(true);
  });

  it('trata una base sin cargar como 0 y manda el resto a la última', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo' },
      { cuentaFinancieraId: 'tarjeta' },
    ];

    const r = calcularPago(78600, filas, tasaDe, 'dividido');

    expect(r.filas[0].baseArs).toBe(0);
    expect(r.filas[1].baseArs).toBe(78600);
  });

  it('deja el resto en negativo si las bases se pasan del total', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 90000 },
      { cuentaFinancieraId: 'tarjeta' },
    ];

    const r = calcularPago(78600, filas, tasaDe, 'dividido');

    expect(r.filas[1].baseArs).toBeLessThan(0);
  });

  it('calcula cada recargo sobre su propia base, no sobre el total', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'tarjeta', baseArs: 10000 },
      { cuentaFinancieraId: 'efectivo' },
    ];

    const r = calcularPago(50000, filas, tasaDe, 'dividido');

    expect(r.filas[0].recargoArs).toBe(1000);
    expect(r.recargos).toBe(1000);
    expect(r.total).toBe(51000);
  });

  it('redondea a dos decimales sin arrastrar centavos', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'debito', baseArs: 333.33 },
      { cuentaFinancieraId: 'efectivo' },
    ];

    const r = calcularPago(1000, filas, tasaDe, 'dividido');

    expect(r.filas[0].recargoArs).toBe(11.67);
    expect(r.filas[1].baseArs).toBe(666.67);
    expect(r.total).toBe(1011.67);
  });
});

describe('validarPago', () => {
  const validar = (mercaderia: number, filas: FilaPago[], modo: 'unica' | 'dividido') =>
    validarPago({
      mercaderia,
      modo,
      filas,
      resultado: calcularPago(mercaderia, filas, tasaDe, modo),
    });

  it('exige elegir una cuenta', () => {
    const errores = validar(78600, [], 'unica');
    expect(errores[0].campo).toBe('pago');
  });

  it('no devuelve errores con una sola cuenta elegida', () => {
    expect(validar(78600, [{ cuentaFinancieraId: 'efectivo' }], 'unica')).toEqual([]);
  });

  it('marca la fila sin cuenta seleccionada', () => {
    const errores = validar(78600, [
      { cuentaFinancieraId: '', baseArs: 100 },
      { cuentaFinancieraId: 'tarjeta' },
    ], 'dividido');

    expect(errores.some((e) => e.mensaje === 'Elegí la cuenta para asignarle el resto.')).toBe(true);
  });

  it('marca la base sin cargar en las filas editables', () => {
    const errores = validar(78600, [
      { cuentaFinancieraId: 'efectivo' },
      { cuentaFinancieraId: 'tarjeta' },
    ], 'dividido');

    expect(errores.some((e) => e.campo === 'pago.0.base')).toBe(true);
  });

  it('bloquea cuando lo asignado supera la mercadería', () => {
    const errores = validar(78600, [
      { cuentaFinancieraId: 'efectivo', baseArs: 90000 },
      { cuentaFinancieraId: 'tarjeta' },
    ], 'dividido');

    expect(errores.some((e) => e.mensaje.includes('supera'))).toBe(true);
  });

  it('rechaza repetir la misma cuenta', () => {
    const errores = validar(78600, [
      { cuentaFinancieraId: 'efectivo', baseArs: 10000 },
      { cuentaFinancieraId: 'efectivo' },
    ], 'dividido');

    expect(errores.some((e) => e.mensaje.includes('No repitas'))).toBe(true);
  });

  it('acepta un reparto que cierra', () => {
    expect(
      validar(78600, [
        { cuentaFinancieraId: 'efectivo', baseArs: 50000 },
        { cuentaFinancieraId: 'tarjeta' },
      ], 'dividido')
    ).toEqual([]);
  });
});

describe('aCuentasInput', () => {
  it('manda a la API el monto con recargo incluido', () => {
    const r = calcularPago(78600, [
      { cuentaFinancieraId: 'efectivo', baseArs: 50000 },
      { cuentaFinancieraId: 'tarjeta' },
    ], tasaDe, 'dividido');

    expect(aCuentasInput(r)).toEqual([
      { cuentaFinancieraId: 'efectivo', montoArs: 50000 },
      { cuentaFinancieraId: 'tarjeta', montoArs: 31460 },
    ]);
  });

  it('descarta filas sin cuenta elegida', () => {
    const r = calcularPago(1000, [{ cuentaFinancieraId: '' }], tasaDe, 'unica');
    expect(aCuentasInput(r)).toEqual([]);
  });
});

describe('repartirEnPartesIguales', () => {
  it('divide el total en partes iguales y la última absorbe el resto', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo' },
      { cuentaFinancieraId: 'debito' },
      { cuentaFinancieraId: 'tarjeta' },
    ];

    const repartidas = repartirEnPartesIguales(90000, filas);
    const r = calcularPago(90000, repartidas, tasaDe, 'dividido');

    expect(repartidas[0].baseArs).toBe(30000);
    expect(repartidas[1].baseArs).toBe(30000);
    expect(repartidas[2].baseArs).toBeUndefined();
    expect(r.filas[2].baseArs).toBe(30000);
    expect(r.filas.reduce((a, f) => a + f.baseArs, 0)).toBe(90000);
  });

  // Criterio de aceptación: dividido + agregar cuenta + partes iguales cierra en cero.
  it('cierra en resto cero con una división que no es exacta', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo' },
      { cuentaFinancieraId: 'debito' },
      { cuentaFinancieraId: 'tarjeta' },
    ];

    const repartidas = repartirEnPartesIguales(100, filas);
    const r = calcularPago(100, repartidas, tasaDe, 'dividido');

    // 100/3 = 33,33 y la última toma 33,34.
    expect(r.filas[0].baseArs).toBe(33.33);
    expect(r.filas[2].baseArs).toBe(33.34);
    expect(r.filas.reduce((a, f) => a + f.baseArs, 0)).toBe(100);
    expect(validarPago({ mercaderia: 100, modo: 'dividido', filas: repartidas, resultado: r })).toEqual([]);
  });

  it('no rompe con una sola fila', () => {
    const r = repartirEnPartesIguales(5000, [{ cuentaFinancieraId: 'efectivo' }]);
    expect(r[0].baseArs).toBeUndefined();
  });
});

describe('maximoParaFila y política de exceso', () => {
  const filas: FilaPago[] = [
    { cuentaFinancieraId: 'efectivo', baseArs: 20000 },
    { cuentaFinancieraId: 'debito', baseArs: 10000 },
    { cuentaFinancieraId: 'tarjeta' },
  ];

  it('el máximo descuenta lo asignado en las otras filas', () => {
    expect(maximoParaFila(78600, filas, 0)).toBe(68600);
    expect(maximoParaFila(78600, filas, 1)).toBe(58600);
  });

  it('limitar recorta el valor al máximo disponible', () => {
    expect(aplicarPoliticaExceso(99999, 68600, 'limitar')).toBe(68600);
    expect(aplicarPoliticaExceso(500, 68600, 'limitar')).toBe(500);
  });

  it('permitir deja pasar el exceso para informarlo', () => {
    expect(aplicarPoliticaExceso(99999, 68600, 'permitir')).toBe(99999);
  });

  it('un campo vacío queda vacío en cualquiera de las dos políticas', () => {
    expect(aplicarPoliticaExceso(undefined, 100, 'limitar')).toBeUndefined();
    expect(aplicarPoliticaExceso(undefined, 100, 'permitir')).toBeUndefined();
  });

  it('con limitar no se reporta excedente, con permitir sí', () => {
    const excedidas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 90000 },
      { cuentaFinancieraId: 'tarjeta' },
    ];
    const resultado = calcularPago(78600, excedidas, tasaDe, 'dividido');

    const conLimite = validarPago({
      mercaderia: 78600, modo: 'dividido', filas: excedidas, resultado, politicaExceso: 'limitar',
    });
    const conPermiso = validarPago({
      mercaderia: 78600, modo: 'dividido', filas: excedidas, resultado, politicaExceso: 'permitir',
    });

    expect(conLimite.some((e) => e.mensaje.includes('supera'))).toBe(false);
    expect(conPermiso.some((e) => e.mensaje.includes('supera'))).toBe(true);
    // El mensaje informa cuánto sobra.
    expect(conPermiso.find((e) => e.mensaje.includes('supera'))?.mensaje).toContain('11400');
  });
});

describe('conversión entre monto y porcentaje', () => {
  it('convierte la base a porcentaje del total', () => {
    expect(baseAPorcentaje(50000, 78600)).toBe(63.61);
    expect(baseAPorcentaje(undefined, 78600)).toBeUndefined();
  });

  it('convierte el porcentaje tipeado a pesos', () => {
    expect(porcentajeABase(50, 78600)).toBe(39300);
    expect(porcentajeABase(undefined, 78600)).toBeUndefined();
  });

  it('no divide por cero cuando todavía no hay mercadería', () => {
    expect(baseAPorcentaje(1000, 0)).toBe(0);
  });
});

describe('fila sin cuenta seleccionada', () => {
  it('bloquea el registro y nombra el resto', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 50000 },
      { cuentaFinancieraId: '' },
    ];
    const resultado = calcularPago(78600, filas, tasaDe, 'dividido');
    const errores = validarPago({ mercaderia: 78600, modo: 'dividido', filas, resultado });

    expect(errores.some((e) => e.mensaje === 'Elegí la cuenta para asignarle el resto.')).toBe(true);
  });
});

describe('modo todavía no elegido', () => {
  it('no calcula reparto y deja todo sin asignar', () => {
    const r = calcularPago(78600, [], tasaDe, null);

    expect(r.filas).toHaveLength(0);
    expect(r.mercaderia).toBe(78600);
    expect(r.total).toBe(78600);
    expect(r.resto).toBe(78600);
  });

  it('bloquea el registro pidiendo elegir el modo', () => {
    const errores = validarPago({ mercaderia: 78600, modo: null, filas: [] });

    expect(errores).toHaveLength(1);
    expect(errores[0].mensaje).toBe('Elegí cómo se reparte el pago.');
  });
});

describe('filasInicialesDivididas', () => {
  it('arranca con dos filas sin cuenta elegida', () => {
    const filas = filasInicialesDivididas(78600);

    expect(filas).toHaveLength(2);
    expect(filas.every((f) => f.cuentaFinancieraId === '')).toBe(true);
  });

  it('reparte mitad y mitad, cerrando en resto cero', () => {
    const filas = filasInicialesDivididas(78600);
    const r = calcularPago(78600, filas, tasaDe, 'dividido');

    expect(filas[0].baseArs).toBe(39300);
    expect(r.filas[1].baseArs).toBe(39300);
    expect(r.filas.reduce((a, f) => a + f.baseArs, 0)).toBe(78600);
  });

  it('la segunda fila absorbe el centavo cuando la mitad no es exacta', () => {
    const filas = filasInicialesDivididas(100.01);
    const r = calcularPago(100.01, filas, tasaDe, 'dividido');

    // 100,01/2 redondea a 50,01 y la última toma los 50,00 restantes.
    expect(filas[0].baseArs).toBe(50.01);
    expect(r.filas[1].baseArs).toBe(50);
    expect(r.filas.reduce((a, f) => a + f.baseArs, 0)).toBeCloseTo(100.01, 2);
  });
});

describe('maximoPorcentajeParaFila', () => {
  it('descuenta lo ya asignado en las otras filas', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 30000 },
      { cuentaFinancieraId: 'debito', baseArs: 20000 },
      { cuentaFinancieraId: 'tarjeta' },
    ];

    // Con 20.000 tomados por otra fila, quedan 80.000 de 100.000 = 80%.
    expect(maximoPorcentajeParaFila(100000, filas, 0)).toBe(80);
    expect(maximoPorcentajeParaFila(100000, filas, 1)).toBe(70);
  });

  it('permite el 100% cuando ninguna otra fila tomó nada', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo' },
      { cuentaFinancieraId: 'tarjeta' },
    ];
    expect(maximoPorcentajeParaFila(100000, filas, 0)).toBe(100);
  });

  it('no divide por cero si todavía no hay mercadería', () => {
    expect(maximoPorcentajeParaFila(0, [{ cuentaFinancieraId: 'efectivo' }], 0)).toBe(100);
  });

  it('entre todas las filas no se supera el 100%', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 60000 },
      { cuentaFinancieraId: 'tarjeta' },
    ];
    const maximo = maximoPorcentajeParaFila(100000, filas, 0);
    const enPesos = porcentajeABase(maximo, 100000)!;

    expect(baseAPorcentaje(60000, 100000)! + 0).toBeLessThanOrEqual(100);
    expect(enPesos).toBeLessThanOrEqual(100000);
  });
});

describe('modo derivado (movimientos)', () => {
  it('el total surge de la suma de las cuentas, sin base previa', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 12000 },
      { cuentaFinancieraId: 'debito', baseArs: 8000 },
    ];

    const r = calcularPago(0, filas, tasaDe, 'derivado');

    expect(r.mercaderia).toBe(20000);
    expect(r.filas).toHaveLength(2);
    expect(r.resto).toBe(0);
  });

  it('aplica el recargo de cada cuenta sobre su propio monto', () => {
    const filas: FilaPago[] = [{ cuentaFinancieraId: 'tarjeta', baseArs: 10000 }];

    const r = calcularPago(0, filas, tasaDe, 'derivado');

    expect(r.recargos).toBe(1000);
    expect(r.total).toBe(11000);
  });

  it('ignora las filas sin cuenta elegida', () => {
    const filas: FilaPago[] = [
      { cuentaFinancieraId: 'efectivo', baseArs: 5000 },
      { cuentaFinancieraId: '', baseArs: 3000 },
    ];

    expect(calcularPago(0, filas, tasaDe, 'derivado').filas).toHaveLength(1);
  });

  it('exige un monto mayor a 0 en cada fila', () => {
    const conCero = validarPago({
      mercaderia: 0,
      modo: 'derivado',
      filas: [{ cuentaFinancieraId: 'efectivo', baseArs: 0 }],
    });
    const sinMonto = validarPago({
      mercaderia: 0,
      modo: 'derivado',
      filas: [{ cuentaFinancieraId: 'efectivo' }],
    });

    expect(conCero.some((e) => e.mensaje.includes('mayor a 0'))).toBe(true);
    expect(sinMonto.some((e) => e.mensaje.includes('Ingresá el monto'))).toBe(true);
  });

  it('acepta un movimiento con montos cargados', () => {
    expect(
      validarPago({
        mercaderia: 0,
        modo: 'derivado',
        filas: [{ cuentaFinancieraId: 'efectivo', baseArs: 5000 }],
      })
    ).toEqual([]);
  });
});
