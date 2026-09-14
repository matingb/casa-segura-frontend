import { OperacionCuentaInput, ModoReparto } from '../../../../../lib/types/OperacionCrear';

/** Tolerancia en pesos para diferencias de redondeo, igual que en el backend. */
export const TOLERANCIA = 0.01;

/** Redondeo a 2 decimales, igual que `redondear` en el backend (reparto-cuentas.ts). */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export interface FilaCalculada {
  extra: number;
  baseArs: number;
  montoArs: number;
  porcentaje: number;
}

export interface ResultadoReparto {
  filas: FilaCalculada[];
  subtotalCubierto: number;
  totalRecargos: number;
  totalFinal: number;
  mensajeError: string | null;
  /** False mientras el reparto no cierre o falten datos para evaluarlo. */
  valido: boolean;
}

interface CalcularRepartoArgs {
  cuentas: OperacionCuentaInput[];
  modoReparto: ModoReparto;
  /** Base sobre la que se reparte, sin recargos. */
  base: number;
  /** Recargo por cuenta, tal como viene de la API. */
  extraDe: Map<string, number>;
  /** True en movimientos: el total surge de las cuentas, no hay base previa. */
  derivarTotalDeCuentas?: boolean;
  /** True si las cuentas son obligatorias para poder guardar. */
  requiereCuentas?: boolean;
  formatMonto: (valor: number) => string;
}

/**
 * Resuelve y valida el reparto entre cuentas. Espeja `resolverReparto` del
 * backend para que el formulario no habilite lo que la API va a rechazar.
 *
 *  - porcentaje: base = total * %, monto = base + recargo
 *  - monto: el usuario carga lo que cobra la cuenta (con recargo),
 *           base = monto / (1 + extra)
 */
export function calcularReparto({
  cuentas,
  modoReparto,
  base,
  extraDe,
  derivarTotalDeCuentas = false,
  requiereCuentas = false,
  formatMonto,
}: CalcularRepartoArgs): ResultadoReparto {
  const filas: FilaCalculada[] = cuentas.map((cuenta) => {
    const extra = extraDe.get(cuenta.cuentaFinancieraId) ?? 0;

    if (modoReparto === 'porcentaje') {
      const porcentaje = cuenta.porcentajeVenta ?? 0;
      const baseArs = redondear(base * (porcentaje / 100));
      return { extra, porcentaje, baseArs, montoArs: redondear(baseArs * (1 + extra / 100)) };
    }

    const montoArs = redondear(cuenta.montoArs ?? 0);
    const baseArs = redondear(montoArs / (1 + extra / 100));
    const referencia = derivarTotalDeCuentas ? 0 : base;
    return {
      extra,
      baseArs,
      montoArs,
      porcentaje: referencia > 0 ? redondear((baseArs / referencia) * 100) : 0,
    };
  });

  const subtotalCubierto = redondear(filas.reduce((acc, f) => acc + f.baseArs, 0));
  const totalFinal = redondear(filas.reduce((acc, f) => acc + f.montoArs, 0));
  const totalRecargos = redondear(totalFinal - subtotalCubierto);
  const sumaPorcentajes = cuentas.reduce((acc, c) => acc + (c.porcentajeVenta ?? 0), 0);

  const sinCuenta = cuentas.some((c) => !c.cuentaFinancieraId);
  // En modo monto una fila sin importe cargado no es un reparto de $0: está incompleta.
  const sinMonto =
    modoReparto === 'monto' && cuentas.some((c) => c.montoArs === undefined || c.montoArs === null);
  const diferencia = derivarTotalDeCuentas ? 0 : redondear(subtotalCubierto - base);

  let mensajeError: string | null = null;
  if (cuentas.length === 0) {
    // Sin filas no hay nada que validar, pero tampoco un reparto que cierre.
    mensajeError = null;
  } else if (sinCuenta) {
    mensajeError = 'Seleccioná una cuenta financiera en cada fila.';
  } else if (sinMonto) {
    mensajeError = 'Ingresá el monto de cada cuenta.';
  } else if (modoReparto === 'porcentaje' && Math.abs(sumaPorcentajes - 100) > TOLERANCIA) {
    mensajeError = `Los porcentajes deben sumar 100%. Suman ${sumaPorcentajes.toFixed(2)}%.`;
  } else if (!derivarTotalDeCuentas && !Number.isFinite(base)) {
    // Un descuento a medio tipear ("-", "1e") vuelve la base NaN: no se puede validar.
    mensajeError = 'Revisá los importes de la operación.';
  } else if (!derivarTotalDeCuentas && Math.abs(diferencia) > TOLERANCIA) {
    mensajeError =
      diferencia < 0
        ? `Faltan ${formatMonto(Math.abs(diferencia))} por asignar.`
        : `Hay ${formatMonto(diferencia)} asignados de más.`;
  } else if (derivarTotalDeCuentas && totalFinal <= 0) {
    mensajeError = 'El monto del movimiento debe ser mayor a 0.';
  }

  // Un reparto vacío nunca es válido cuando las cuentas son obligatorias.
  const valido = mensajeError === null && (!requiereCuentas || cuentas.length > 0);

  return { filas, subtotalCubierto, totalRecargos, totalFinal, mensajeError, valido };
}
