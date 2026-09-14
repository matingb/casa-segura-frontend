import { OperacionCuentaInput } from '../../../../../lib/types/OperacionCrear';

/** Tolerancia en pesos para diferencias de redondeo, igual que en el backend. */
export const TOLERANCIA = 0.01;

/**
 * Cómo se cubre el total de la operación. `null` mientras no se eligió.
 * 'derivado' es el caso de los movimientos: el total sale de las cuentas.
 */
export type ModoPago = 'unica' | 'dividido' | 'derivado';
export type ModoPagoElegido = ModoPago | null;

/**
 * Cómo se reparte entre las cuentas:
 *  - 'iguales': partes iguales, sin edición manual.
 *  - 'monto' / 'porcentaje': el usuario carga cada fila en esa unidad.
 */
export type UnidadReparto = 'iguales' | 'monto' | 'porcentaje';

/**
 * Qué hacer cuando la base cargada supera el total disponible.
 *  - 'limitar': se recorta al máximo (no se puede escribir de más).
 *  - 'permitir': se acepta y se informa el excedente, bloqueando el registro.
 */
export type PoliticaExceso = 'limitar' | 'permitir';

/** Redondeo a 2 decimales, espeja `redondear` de reparto-cuentas.ts en el backend. */
export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Una fila del reparto tal como la edita el usuario: la base, sin recargo. */
export interface FilaPago {
  cuentaFinancieraId: string;
  /** Base asignada a esta cuenta, sin recargo. `undefined` mientras no se cargó. */
  baseArs?: number;
}

export interface FilaResuelta {
  cuentaFinancieraId: string;
  /** Recargo de la cuenta, en porcentaje. */
  tasa: number;
  /** Base asignada, sin recargo. */
  baseArs: number;
  /** Recargo en pesos sobre la base asignada. */
  recargoArs: number;
  /** Lo que efectivamente debita la cuenta: base + recargo. */
  debitaArs: number;
  /** True si la fila absorbe el resto y no se edita. */
  esResto: boolean;
}

export interface ResultadoPago {
  filas: FilaResuelta[];
  /** Suma de los importes de productos, sin recargos. */
  mercaderia: number;
  /** Suma de los recargos de todas las cuentas. */
  recargos: number;
  /** Lo que realmente se paga: mercadería + recargos. */
  total: number;
  /** Lo que queda sin asignar (solo en modo dividido). */
  resto: number;
}

/**
 * Resuelve el reparto del pago entre cuentas.
 *
 * El recargo se aplica SOBRE LA BASE ASIGNADA a cada cuenta, no sobre el total
 * de la operación. Espeja `resolverReparto` del backend para que la UI nunca
 * muestre un total distinto al que va a registrar el servidor:
 *
 *   recargoCuenta = baseAsignada * (tasa / 100)
 *   total         = mercaderia + Σ recargoCuenta
 *
 * En modo dividido la última fila absorbe el resto, así el reparto siempre
 * cierra contra la mercadería y no queda saldo sin asignar.
 */
export function calcularPago(
  mercaderia: number,
  filas: FilaPago[],
  tasaDe: Map<string, number>,
  modo: ModoPagoElegido
): ResultadoPago {
  const mercaderiaSegura = Number.isFinite(mercaderia) ? mercaderia : 0;

  // Sin modo elegido todavía no hay reparto: solo se conoce la mercadería.
  if (modo === null) {
    return armar([], mercaderiaSegura, mercaderiaSegura);
  }

  const resolver = (cuentaFinancieraId: string, baseArs: number, esResto: boolean): FilaResuelta => {
    const tasa = tasaDe.get(cuentaFinancieraId) ?? 0;
    const base = redondear(baseArs);
    const recargoArs = redondear(base * (tasa / 100));
    return {
      cuentaFinancieraId,
      tasa,
      baseArs: base,
      recargoArs,
      debitaArs: redondear(base + recargoArs),
      esResto,
    };
  };

  // Movimiento: cada fila carga lo que entra o sale y el total es la suma.
  if (modo === 'derivado') {
    const resueltas = filas
      .filter((f) => f.cuentaFinancieraId)
      .map((f) => resolver(f.cuentaFinancieraId, f.baseArs ?? 0, false));
    const base = redondear(resueltas.reduce((acc, f) => acc + f.baseArs, 0));
    return armar(resueltas, base, 0);
  }

  // Una sola cuenta: toma toda la mercadería, no hay nada que repartir.
  if (modo === 'unica') {
    const cuenta = filas[0];
    const resueltas = cuenta?.cuentaFinancieraId
      ? [resolver(cuenta.cuentaFinancieraId, mercaderiaSegura, true)]
      : [];
    return armar(resueltas, mercaderiaSegura, 0);
  }

  // Dividido: las filas intermedias llevan lo que cargó el usuario y la última
  // absorbe el resto, de modo que la suma siempre da la mercadería.
  const asignadas = filas.slice(0, -1);
  const ultima = filas[filas.length - 1];

  const resueltas = asignadas.map((f) => resolver(f.cuentaFinancieraId, f.baseArs ?? 0, false));
  const cubierto = redondear(resueltas.reduce((acc, f) => acc + f.baseArs, 0));
  const resto = redondear(mercaderiaSegura - cubierto);

  if (ultima) {
    // Un resto negativo significa que las bases editables se pasaron del total;
    // se muestra tal cual para que el error inline explique por qué no cierra.
    resueltas.push(resolver(ultima.cuentaFinancieraId, resto, true));
  }

  return armar(resueltas, mercaderiaSegura, ultima ? 0 : resto);
}

function armar(filas: FilaResuelta[], mercaderia: number, resto: number): ResultadoPago {
  const recargos = redondear(filas.reduce((acc, f) => acc + f.recargoArs, 0));
  return {
    filas,
    mercaderia: redondear(mercaderia),
    recargos,
    total: redondear(mercaderia + recargos),
    resto,
  };
}

/** Error de validación asociado a un control concreto del formulario. */
export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

export interface ValidarPagoArgs {
  mercaderia: number;
  modo: ModoPagoElegido;
  filas: FilaPago[];
  /** Se acepta por compatibilidad con quien ya lo calcula; no se consulta. */
  resultado?: ResultadoPago;
  /** Cómo trata la pantalla una base que se pasa del total. */
  politicaExceso?: PoliticaExceso;
}

/**
 * Valida el bloque de pago. Devuelve un error por control para poder mostrarlo
 * inline, en vez de un único cartel al pie del formulario.
 */
export function validarPago({
  mercaderia,
  modo,
  filas,
  politicaExceso = 'permitir',
}: ValidarPagoArgs): ErrorCampo[] {
  const errores: ErrorCampo[] = [];

  if (modo === null) {
    errores.push({ campo: 'pago', mensaje: 'Elegí cómo se reparte el pago.' });
    return errores;
  }

  if (filas.length === 0) {
    errores.push({ campo: 'pago', mensaje: 'Elegí con qué cuenta se paga.' });
    return errores;
  }

  // Una fila sin cuenta es la que iba a recibir el resto: se nombra así.
  if (filas.some((f) => !f.cuentaFinancieraId)) {
    errores.push({ campo: 'pago', mensaje: 'Elegí la cuenta para asignarle el resto.' });
  }

  const idsUsados = filas.map((f) => f.cuentaFinancieraId).filter(Boolean);
  if (new Set(idsUsados).size !== idsUsados.length) {
    errores.push({ campo: 'pago', mensaje: 'No repitas la misma cuenta en dos filas.' });
  }

  if (modo === 'derivado') {
    filas.forEach((f, i) => {
      if (f.baseArs === undefined || f.baseArs === null) {
        errores.push({ campo: `pago.${i}.base`, mensaje: 'Ingresá el monto.' });
      } else if (f.baseArs <= 0) {
        errores.push({ campo: `pago.${i}.base`, mensaje: 'Tiene que ser mayor a 0.' });
      }
    });
    return errores;
  }

  if (modo === 'dividido') {
    filas.slice(0, -1).forEach((f, i) => {
      if (f.baseArs === undefined || f.baseArs === null) {
        errores.push({ campo: `pago.${i}.base`, mensaje: 'Ingresá el monto.' });
      } else if (f.baseArs < 0) {
        errores.push({ campo: `pago.${i}.base`, mensaje: 'El monto no puede ser negativo.' });
      }
    });

    const asignado = redondear(
      filas.slice(0, -1).reduce((acc, f) => acc + (f.baseArs ?? 0), 0)
    );
    const excedente = redondear(asignado - mercaderia);
    if (excedente > TOLERANCIA && politicaExceso === 'permitir') {
      errores.push({
        campo: 'pago',
        mensaje: `Lo asignado supera el total en $${excedente.toFixed(2)}.`,
      });
    }
  }

  return errores;
}

/** Traduce el reparto resuelto al formato que espera la API. */
export function aCuentasInput(resultado: ResultadoPago): OperacionCuentaInput[] {
  return resultado.filas
    .filter((f) => f.cuentaFinancieraId)
    .map((f) => ({
      cuentaFinancieraId: f.cuentaFinancieraId,
      // El backend recibe el monto con recargo incluido y deriva la base.
      montoArs: f.debitaArs,
    }));
}

/**
 * Reparte el total en partes iguales entre las filas cargadas.
 * La última no se asigna: absorbe el redondeo como resto, así la suma cierra
 * exactamente aunque la división tenga centavos periódicos.
 */
export function repartirEnPartesIguales(mercaderia: number, filas: FilaPago[]): FilaPago[] {
  if (filas.length === 0) return filas;

  const base = Number.isFinite(mercaderia) ? mercaderia : 0;
  const parte = redondear(base / filas.length);

  return filas.map((fila, i) =>
    i === filas.length - 1 ? { ...fila, baseArs: undefined } : { ...fila, baseArs: parte }
  );
}

/**
 * Máximo que puede tomar la base de una fila sin pasarse del total: lo que
 * queda después de lo asignado en las demás filas editables.
 */
export function maximoParaFila(mercaderia: number, filas: FilaPago[], index: number): number {
  const base = Number.isFinite(mercaderia) ? mercaderia : 0;
  const otras = filas
    .slice(0, -1)
    .reduce((acc, f, i) => (i === index ? acc : acc + (f.baseArs ?? 0)), 0);
  return Math.max(0, redondear(base - otras));
}

/**
 * Aplica la política de exceso al valor que el usuario acaba de tipear.
 * Con 'limitar' se recorta al máximo disponible; con 'permitir' pasa tal cual
 * y el error inline se encarga de informarlo.
 */
export function aplicarPoliticaExceso(
  valor: number | undefined,
  maximo: number,
  politica: PoliticaExceso
): number | undefined {
  if (valor === undefined) return undefined;
  if (politica === 'limitar' && valor > maximo) return maximo;
  return valor;
}

/** Porcentaje que representa una base sobre el total, para la entrada por %. */
export function baseAPorcentaje(baseArs: number | undefined, mercaderia: number): number | undefined {
  if (baseArs === undefined) return undefined;
  if (!Number.isFinite(mercaderia) || mercaderia <= 0) return 0;
  return redondear((baseArs / mercaderia) * 100);
}

/** Convierte el porcentaje tipeado por el usuario a la base en pesos. */
export function porcentajeABase(porcentaje: number | undefined, mercaderia: number): number | undefined {
  if (porcentaje === undefined) return undefined;
  if (!Number.isFinite(mercaderia)) return 0;
  return redondear((mercaderia * porcentaje) / 100);
}

/** Cuántas filas arranca el modo dividido. */
export const FILAS_INICIALES_DIVIDIDO = 2;

/**
 * Filas con las que arranca el modo dividido: dos cuentas a elegir, repartidas
 * en partes iguales para que el reparto ya cierre en resto cero.
 */
export function filasInicialesDivididas(mercaderia: number): FilaPago[] {
  const vacias: FilaPago[] = Array.from({ length: FILAS_INICIALES_DIVIDIDO }, () => ({
    cuentaFinancieraId: '',
  }));
  return repartirEnPartesIguales(mercaderia, vacias);
}

/**
 * Porcentaje máximo que puede tomar una fila: 100 menos lo ya asignado en las
 * otras filas editables. Evita que entre todas se pasen del 100%.
 */
export function maximoPorcentajeParaFila(
  mercaderia: number,
  filas: FilaPago[],
  index: number
): number {
  if (!Number.isFinite(mercaderia) || mercaderia <= 0) return 100;
  return redondear((maximoParaFila(mercaderia, filas, index) / mercaderia) * 100);
}
