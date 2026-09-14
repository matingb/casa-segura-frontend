'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '../../../../../components/ui/Button/Button';
import Select from '../../../../../components/ui/Select/Select';
import Input from '../../../../../components/ui/Input/Input';
import { cuentaFinancieraClient } from '../../../../../lib/api/cuenta-financiera.client';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';
import { OperacionCuentaInput, ModoReparto } from '../../../../../lib/types/OperacionCrear';
import { formatARS } from '../../../../../lib/utils/formatters';
import { calcularReparto } from './reparto';
import styles from './CuentasEditor.module.css';

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
  /** True si no se puede guardar sin al menos una cuenta cargada. */
  requiereCuentas?: boolean;
  /** Etiqueta del importe segun el sentido de la operacion. */
  etiquetaMonto?: string;
}

export default function CuentasEditor({
  cuentas,
  onChange,
  modoReparto,
  onModoRepartoChange,
  base = 0,
  derivarTotalDeCuentas = false,
  onValidezChange,
  requiereCuentas = false,
  etiquetaMonto = 'Monto ($)',
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

  const { filas, subtotalCubierto, totalRecargos, totalFinal, mensajeError, valido } = useMemo(
    () =>
      calcularReparto({
        cuentas,
        modoReparto,
        base,
        extraDe,
        derivarTotalDeCuentas,
        requiereCuentas,
        formatMonto: formatARS,
      }),
    [cuentas, modoReparto, base, extraDe, derivarTotalDeCuentas, requiereCuentas]
  );

  useEffect(() => {
    onValidezChange?.(valido);
  }, [valido, onValidezChange]);

  const agregarCuenta = () => {
    onChange([
      ...cuentas,
      modoReparto === 'porcentaje'
        ? { cuentaFinancieraId: '', porcentajeVenta: cuentas.length === 0 ? 100 : 0 }
        : { cuentaFinancieraId: '', montoArs: undefined },
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
    // Conserva el reparto actual y lo expresa en la unidad elegida.
    onChange(
      cuentas.map((c, index) =>
        modo === 'porcentaje'
          ? { cuentaFinancieraId: c.cuentaFinancieraId, porcentajeVenta: filas[index].porcentaje }
          : { cuentaFinancieraId: c.cuentaFinancieraId, montoArs: filas[index].montoArs }
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
                label={etiquetaMonto}
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
