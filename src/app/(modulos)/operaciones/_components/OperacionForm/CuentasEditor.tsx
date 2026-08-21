'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '../../../../../components/ui/Button/Button';
import Select from '../../../../../components/ui/Select/Select';
import Input from '../../../../../components/ui/Input/Input';
import { cuentaFinancieraClient } from '../../../../../lib/api/cuenta-financiera.client';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';
import { OperacionCuentaInput, ModoReparto } from '../../../../../lib/types/OperacionCrear';
import { formatARS } from '../../../../../lib/utils/formatters';
import styles from './CuentasEditor.module.css';

/** Tolerancia en pesos para diferencias de redondeo, igual que en el backend. */
const TOLERANCIA = 0.01;

interface CuentasEditorProps {
  cuentas: OperacionCuentaInput[];
  onChange: (cuentas: OperacionCuentaInput[]) => void;
  modoReparto: ModoReparto;
  onModoRepartoChange: (modo: ModoReparto) => void;
  /**
   * Base sobre la que se reparte, sin recargos. En movimientos se omite:
   * ahí el total surge de las propias cuentas.
   */
  base?: number;
  /** True en movimientos: no hay base previa contra la cual validar. */
  derivarTotalDeCuentas?: boolean;
  /** Informa al formulario si el reparto no cierra. */
  onValidezChange?: (valido: boolean) => void;
}

interface FilaCalculada {
  extra: number;
  baseArs: number;
  montoArs: number;
  porcentaje: number;
}

export default function CuentasEditor({
  cuentas,
  onChange,
  modoReparto,
  onModoRepartoChange,
  base = 0,
  derivarTotalDeCuentas = false,
  onValidezChange,
}: CuentasEditorProps) {
  const [cuentasDisponibles, setCuentasDisponibles] = useState<CuentaFinanciera[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cuentaFinancieraClient
      .obtenerTodas()
      .then(setCuentasDisponibles)
      .catch((err) => console.error('[CuentasEditor] Error cargando cuentas:', err))
      .finally(() => setLoading(false));
  }, []);

  const extraDe = useMemo(() => {
    const map = new Map<string, number>();
    cuentasDisponibles.forEach((c) => map.set(c.id, c.porcentajeExtra ?? 0));
    return map;
  }, [cuentasDisponibles]);

  /**
   * Resuelve cada fila según el modo:
   *  - porcentaje: base = total * %, monto = base + recargo
   *  - monto: el usuario carga lo que cobra la cuenta (con recargo), base = monto / (1 + extra)
   */
  const filas: FilaCalculada[] = useMemo(() => {
    return cuentas.map((cuenta) => {
      const extra = extraDe.get(cuenta.cuentaFinancieraId) ?? 0;
      if (modoReparto === 'porcentaje') {
        const porcentaje = cuenta.porcentajeVenta ?? 0;
        const baseArs = base * (porcentaje / 100);
        return { extra, porcentaje, baseArs, montoArs: baseArs * (1 + extra / 100) };
      }
      const montoArs = cuenta.montoArs ?? 0;
      const baseArs = montoArs / (1 + extra / 100);
      const referencia = derivarTotalDeCuentas ? null : base;
      return {
        extra,
        baseArs,
        montoArs,
        porcentaje: referencia && referencia > 0 ? (baseArs / referencia) * 100 : 0,
      };
    });
  }, [cuentas, extraDe, modoReparto, base, derivarTotalDeCuentas]);

  const subtotalCubierto = filas.reduce((acc, f) => acc + f.baseArs, 0);
  const totalRecargos = filas.reduce((acc, f) => acc + (f.montoArs - f.baseArs), 0);
  const totalFinal = filas.reduce((acc, f) => acc + f.montoArs, 0);
  const sumaPorcentajes = cuentas.reduce((acc, c) => acc + (c.porcentajeVenta ?? 0), 0);

  const sinCuenta = cuentas.some((c) => !c.cuentaFinancieraId);
  const diferencia = derivarTotalDeCuentas ? 0 : subtotalCubierto - base;

  let mensajeError: string | null = null;
  if (cuentas.length === 0) {
    mensajeError = null; // el formulario decide si son obligatorias
  } else if (sinCuenta) {
    mensajeError = 'Seleccioná una cuenta financiera en cada fila.';
  } else if (modoReparto === 'porcentaje' && Math.abs(sumaPorcentajes - 100) > TOLERANCIA) {
    mensajeError = `Los porcentajes deben sumar 100%. Suman ${sumaPorcentajes.toFixed(2)}%.`;
  } else if (!derivarTotalDeCuentas && Math.abs(diferencia) > TOLERANCIA) {
    mensajeError =
      diferencia < 0
        ? `Faltan ${formatARS(Math.abs(diferencia))} por asignar.`
        : `Hay ${formatARS(diferencia)} asignados de más.`;
  } else if (derivarTotalDeCuentas && totalFinal <= 0) {
    mensajeError = 'El monto del movimiento debe ser mayor a 0.';
  }

  useEffect(() => {
    onValidezChange?.(mensajeError === null);
  }, [mensajeError, onValidezChange]);

  const agregarCuenta = () => {
    onChange([
      ...cuentas,
      modoReparto === 'porcentaje'
        ? { cuentaFinancieraId: '', porcentajeVenta: 0 }
        : { cuentaFinancieraId: '', montoArs: 0 },
    ]);
  };

  const quitarCuenta = (index: number) => {
    onChange(cuentas.filter((_, i) => i !== index));
  };

  const actualizarCuenta = (index: number, patch: Partial<OperacionCuentaInput>) => {
    onChange(cuentas.map((cuenta, i) => (i === index ? { ...cuenta, ...patch } : cuenta)));
  };

  const cambiarModo = (modo: ModoReparto) => {
    if (modo === modoReparto) return;
    // Al cambiar de modo se limpia el valor del modo anterior para no arrastrar datos inconsistentes.
    onChange(
      cuentas.map((c) =>
        modo === 'porcentaje'
          ? { cuentaFinancieraId: c.cuentaFinancieraId, porcentajeVenta: 0 }
          : { cuentaFinancieraId: c.cuentaFinancieraId, montoArs: 0 }
      )
    );
    onModoRepartoChange(modo);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>Cuentas financieras</h3>
        <div className={styles.headerActions}>
          {!derivarTotalDeCuentas && (
            <div className={styles.toggle}>
              <span className={styles.toggleLabel}>Repartir por:</span>
              <button
                type="button"
                className={modoReparto === 'porcentaje' ? styles.toggleOptionActive : styles.toggleOption}
                onClick={() => cambiarModo('porcentaje')}
              >
                %
              </button>
              <button
                type="button"
                className={modoReparto === 'monto' ? styles.toggleOptionActive : styles.toggleOption}
                onClick={() => cambiarModo('monto')}
              >
                Monto
              </button>
            </div>
          )}
          <Button type="button" variant="secondary" onClick={agregarCuenta}>
            + Agregar cuenta
          </Button>
        </div>
      </div>

      {cuentas.length === 0 && <p className={styles.hint}>No hay cuentas asociadas.</p>}

      {cuentas.map((cuenta, index) => {
        const fila = filas[index];
        return (
          <div key={index} className={styles.row}>
            <Select
              label="Cuenta"
              value={cuenta.cuentaFinancieraId}
              onChange={(e) => actualizarCuenta(index, { cuentaFinancieraId: e.target.value })}
              disabled={loading}
            >
              <option value="">{loading ? 'Cargando...' : 'Seleccionar cuenta'}</option>
              {cuentasDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.porcentajeExtra ? ` (+${c.porcentajeExtra}%)` : ''}
                </option>
              ))}
            </Select>

            {modoReparto === 'porcentaje' ? (
              <Input
                label="% de la venta"
                type="number"
                step="0.01"
                min="0"
                value={cuenta.porcentajeVenta ?? ''}
                onChange={(e) =>
                  actualizarCuenta(index, { porcentajeVenta: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            ) : (
              <Input
                label="Monto a cobrar ($)"
                type="number"
                step="0.01"
                min="0"
                value={cuenta.montoArs ?? ''}
                onChange={(e) =>
                  actualizarCuenta(index, { montoArs: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            )}

            <div className={styles.calculado}>
              {modoReparto === 'porcentaje' ? (
                <>
                  <span className={styles.calculadoValor}>{formatARS(fila.montoArs)}</span>
                  {fila.extra > 0 && (
                    <span className={styles.calculadoHint}>
                      {formatARS(fila.baseArs)} + {fila.extra}% recargo
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className={styles.calculadoValor}>
                    {derivarTotalDeCuentas ? formatARS(fila.baseArs) : `${fila.porcentaje.toFixed(2)}%`}
                  </span>
                  {fila.extra > 0 && (
                    <span className={styles.calculadoHint}>
                      base {formatARS(fila.baseArs)} · {fila.extra}% recargo
                    </span>
                  )}
                </>
              )}
            </div>

            <Button type="button" variant="danger" onClick={() => quitarCuenta(index)}>
              Quitar
            </Button>
          </div>
        );
      })}

      {cuentas.length > 0 && (
        <div className={styles.resumen}>
          <div className={styles.resumenLinea}>
            <span>Subtotal</span>
            <span>{formatARS(subtotalCubierto)}</span>
          </div>
          <div className={styles.resumenLinea}>
            <span>Recargos</span>
            <span>{formatARS(totalRecargos)}</span>
          </div>
          <div className={`${styles.resumenLinea} ${styles.resumenTotal}`}>
            <span>Total</span>
            <span>{formatARS(totalFinal)}</span>
          </div>
          {mensajeError && <p className={styles.error}>{mensajeError}</p>}
        </div>
      )}
    </div>
  );
}
