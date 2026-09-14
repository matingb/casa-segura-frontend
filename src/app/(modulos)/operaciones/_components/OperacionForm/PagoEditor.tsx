'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import IconButton from '../../../../../components/ui/IconButton/IconButton';
import { cuentaFinancieraClient } from '../../../../../lib/api/cuenta-financiera.client';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';
import { formatARS, formatPorcentaje } from '../../../../../lib/utils/formatters';
import {
  aplicarPoliticaExceso,
  baseAPorcentaje,
  calcularPago,
  maximoParaFila,
  maximoPorcentajeParaFila,
  porcentajeABase,
  repartirEnPartesIguales,
  filasInicialesDivididas,
  FilaPago,
  ModoPagoElegido,
  PoliticaExceso,
  ResultadoPago,
  UnidadReparto,
} from './pago';
import styles from './PagoEditor.module.css';

interface PagoEditorProps {
  /** Suma de los importes de productos, sin recargos. */
  mercaderia: number;
  modo: ModoPagoElegido;
  onModoChange: (modo: ModoPagoElegido) => void;
  filas: FilaPago[];
  onFilasChange: (filas: FilaPago[]) => void;
  /** Recargo por cuenta, para que el formulario resuelva el mismo total. */
  onTasasChange?: (tasas: Map<string, number>) => void;
  /** Errores por campo, solo después de que el usuario intentó registrar. */
  errores?: Record<string, string>;
  /** Se limpia el error del campo apenas se lo edita. */
  onCampoEditado?: (campo: string) => void;
  etiquetaAccion?: string;
  /** Encabezado de la columna del monto final: debita en compras, acredita en ventas. */
  etiquetaDebita?: string;
  /** Sin productos cargados no hay monto que repartir: el bloque queda inactivo. */
  habilitado?: boolean;
  /** Qué hacer cuando la base cargada supera el total disponible. */
  politicaExceso?: PoliticaExceso;
  /** Título del bloque. */
  titulo?: string;
  /** Encabezado de la columna editable. */
  etiquetaBase?: string;
}

export default function PagoEditor({
  mercaderia,
  modo,
  onModoChange,
  filas,
  onFilasChange,
  onTasasChange,
  errores = {},
  onCampoEditado,
  etiquetaAccion = 'pagar',
  etiquetaDebita = 'Debita',
  habilitado = true,
  politicaExceso = 'permitir',
  titulo = 'Pago',
  etiquetaBase = 'Base',
}: PagoEditorProps) {
  const [cuentasDisponibles, setCuentasDisponibles] = useState<CuentaFinanciera[]>([]);
  const [loading, setLoading] = useState(true);
  /** Se conserva mientras dure la carga: agregar una fila no lo resetea. */
  const [unidad, setUnidad] = useState<UnidadReparto>('iguales');

  useEffect(() => {
    cuentaFinancieraClient
      .obtenerTodas()
      .then(setCuentasDisponibles)
      .catch((err) => console.error('[PagoEditor] Error cargando cuentas:', err))
      .finally(() => setLoading(false));
  }, []);

  const tasaDe = useMemo(() => {
    const map = new Map<string, number>();
    cuentasDisponibles.forEach((c) => map.set(c.id, c.porcentajeExtra ?? 0));
    return map;
  }, [cuentasDisponibles]);

  useEffect(() => {
    onTasasChange?.(tasaDe);
  }, [tasaDe, onTasasChange]);

  const resultado: ResultadoPago = useMemo(
    () => calcularPago(mercaderia, filas, tasaDe, modo),
    [mercaderia, filas, tasaDe, modo]
  );

  const cuentaUnicaId = modo === 'unica' ? filas[0]?.cuentaFinancieraId ?? '' : '';

  const cambiarModo = (nuevo: ModoPagoElegido) => {
    if (nuevo === modo) return;
    onCampoEditado?.('pago');

    if (nuevo === 'unica') {
      // Conserva la cuenta ya elegida, que pasa a cubrir el total.
      const elegida = filas.find((f) => f.cuentaFinancieraId)?.cuentaFinancieraId ?? '';
      onFilasChange(elegida ? [{ cuentaFinancieraId: elegida }] : []);
    } else {
      // Dos filas a elegir, ya repartidas en partes iguales.
      onFilasChange(filasInicialesDivididas(mercaderia));
    }
    onModoChange(nuevo);
  };

  const elegirCuentaUnica = (cuentaFinancieraId: string) => {
    onCampoEditado?.('pago');
    onFilasChange([{ cuentaFinancieraId }]);
  };

  const actualizarFila = (index: number, patch: Partial<FilaPago>) => {
    onFilasChange(filas.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  /** Escribe la base de una fila respetando la política de exceso. */
  const editarBase = (index: number, valor: number | undefined) => {
    onCampoEditado?.(`pago.${index}.base`);
    onCampoEditado?.('pago');
    const maximo = maximoParaFila(mercaderia, filas, index);
    actualizarFila(index, { baseArs: aplicarPoliticaExceso(valor, maximo, politicaExceso) });
  };

  const agregarFila = () => {
    onCampoEditado?.('pago');

    // En movimientos no hay fila que absorba el resto: se suma una vacía.
    if (modo === 'derivado') {
      onFilasChange([...filas, { cuentaFinancieraId: '' }]);
      return;
    }

    // La fila que venía absorbiendo el resto fija su base, y la nueva toma el
    // resto: así el reparto sigue cerrando al agregar.
    const previas = filas.slice(0, -1);
    const ultima = filas[filas.length - 1];
    const ultimaResuelta = resultado.filas[filas.length - 1];

    const conNueva: FilaPago[] = [
      ...previas,
      { ...ultima, baseArs: ultimaResuelta?.baseArs ?? 0 },
      { cuentaFinancieraId: '' },
    ];

    // En partes iguales el reparto se rehace para que siga cerrando.
    onFilasChange(unidad === 'iguales' ? repartirEnPartesIguales(mercaderia, conNueva) : conNueva);
  };

  /** Explicacion del chip "resto", antes leyenda al pie del bloque. */
  const leyendaResto =
    'La ultima fila toma el resto para que el reparto cierre con lo que hay que ' +
    etiquetaAccion +
    '.';

  const elegirUnidad = (nueva: UnidadReparto) => {
    setUnidad(nueva);
    if (nueva === 'iguales') {
      onCampoEditado?.('pago');
      onFilasChange(repartirEnPartesIguales(mercaderia, filas));
    }
  };

  const quitarFila = (index: number) => {
    onCampoEditado?.('pago');
    const restantes = filas.filter((_, i) => i !== index);
    onFilasChange(
      unidad === 'iguales' ? repartirEnPartesIguales(mercaderia, restantes) : restantes
    );
  };

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>{titulo}</h3>

      {!habilitado && (
        <p className={styles.hint}>Agregá un producto para definir cómo se {etiquetaAccion}.</p>
      )}

      {habilitado && (
        <>
      <div className={styles.modos}>
        <button
          type="button"
          className={modo === 'unica' ? styles.modoActivo : styles.modo}
          onClick={() => cambiarModo('unica')}
          aria-pressed={modo === 'unica'}
        >
          <span className={styles.modoNombre}>Una sola cuenta</span>
          <span className={styles.modoDetalle}>El total sale de un solo medio</span>
        </button>
        <button
          type="button"
          className={modo === 'dividido' ? styles.modoActivo : styles.modo}
          onClick={() => cambiarModo('dividido')}
          aria-pressed={modo === 'dividido'}
        >
          <span className={styles.modoNombre}>Dividido</span>
          <span className={styles.modoDetalle}>Se reparte entre dos o más cuentas</span>
        </button>
      </div>

      {loading && <p className={styles.hint}>Cargando cuentas...</p>}

      {!loading && modo === 'unica' && (
        <div className={styles.opciones}>
          {cuentasDisponibles.map((cuenta) => {
            const tasa = cuenta.porcentajeExtra ?? 0;
            const total = mercaderia * (1 + tasa / 100);
            const elegida = cuenta.id === cuentaUnicaId;
            return (
              <button
                key={cuenta.id}
                type="button"
                className={elegida ? styles.opcionActiva : styles.opcion}
                onClick={() => elegirCuentaUnica(cuenta.id)}
                aria-pressed={elegida}
              >
                <span className={styles.opcionInfo}>
                  <span className={styles.opcionNombre}>{cuenta.nombre}</span>
                  <span className={styles.opcionRecargo}>
                    {tasa > 0 ? `${tasa}% de recargo` : 'Sin recargo'}
                  </span>
                </span>
                <span className={styles.opcionTotal}>{formatARS(total)}</span>
              </button>
            );
          })}
          {cuentasDisponibles.length === 0 && (
            <p className={styles.hint}>No hay cuentas financieras cargadas.</p>
          )}
        </div>
      )}

      {!loading && (modo === 'dividido' || modo === 'derivado') && (
        <>
          {modo === 'dividido' && (
          <div className={styles.reparto}>
            <span className={styles.repartoEtiqueta}>Dividir:</span>
            <div className={styles.unidades}>
              <button
                type="button"
                className={unidad === 'iguales' ? styles.unidadActiva : styles.unidad}
                onClick={() => elegirUnidad('iguales')}
                aria-pressed={unidad === 'iguales'}
              >
                Partes iguales
              </button>
              <button
                type="button"
                className={unidad === 'monto' ? styles.unidadActiva : styles.unidad}
                onClick={() => elegirUnidad('monto')}
                aria-pressed={unidad === 'monto'}
              >
                Por monto
              </button>
              <button
                type="button"
                className={unidad === 'porcentaje' ? styles.unidadActiva : styles.unidad}
                onClick={() => elegirUnidad('porcentaje')}
                aria-pressed={unidad === 'porcentaje'}
              >
                Por porcentaje
              </button>
            </div>
          </div>
          )}

          <table className={styles.tabla}>
            <thead>
              <tr>
                <th scope="col" className={styles.colCuenta}>Cuenta</th>
                {modo === 'dividido' && unidad === 'porcentaje' && (
                  <th scope="col" className={styles.colPorcentaje}>%</th>
                )}
                <th scope="col" className={styles.colNumero}>{etiquetaBase}</th>
                <th scope="col" className={styles.colNumero}>Recargo</th>
                <th scope="col" className={styles.colNumero}>{etiquetaDebita}</th>
                <th scope="col" className={styles.colAccion} aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, index) => {
                const resuelta = resultado.filas[index];
                const esUltima = modo !== 'derivado' && index === filas.length - 1;
                const sinCuenta = !fila.cuentaFinancieraId;
                const errorBase = errores[`pago.${index}.base`];

                return (
                  <tr key={index}>
                    <td className={styles.colCuenta}>
                      <select
                        className={sinCuenta ? styles.selectCuentaError : styles.selectCuenta}
                        value={fila.cuentaFinancieraId}
                        aria-label={`Cuenta de la fila ${index + 1}`}
                        onChange={(e) => {
                          onCampoEditado?.('pago');
                          actualizarFila(index, { cuentaFinancieraId: e.target.value });
                        }}
                      >
                        <option value="">Seleccionar cuenta</option>
                        {cuentasDisponibles.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                            {c.porcentajeExtra ? ` (+${c.porcentajeExtra}%)` : ''}
                          </option>
                        ))}
                      </select>
                    </td>

                    {modo === 'dividido' && unidad === 'porcentaje' && (
                      <td className={styles.colPorcentaje}>
                        {esUltima ? (
                          <span className={sinCuenta ? styles.celdaAtenuada : styles.celdaCalculada}>
                            {formatPorcentaje(baseAPorcentaje(resuelta?.baseArs, mercaderia) ?? 0)}
                          </span>
                        ) : (
                          <input
                            className={errorBase ? styles.inputError : styles.inputNumero}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            max={maximoPorcentajeParaFila(mercaderia, filas, index)}
                            aria-label={`Porcentaje de la fila ${index + 1}`}
                            value={baseAPorcentaje(fila.baseArs, mercaderia) ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              const pedido = v === '' ? undefined : Number(v);
                              // El tope de 100 entre todas sale de acotar cada fila
                              // a lo que quedó libre en las demás.
                              const tope = maximoPorcentajeParaFila(mercaderia, filas, index);
                              const acotado =
                                pedido === undefined ? undefined : Math.min(pedido, tope);
                              editarBase(index, porcentajeABase(acotado, mercaderia));
                            }}
                          />
                        )}
                      </td>
                    )}

                    <td className={styles.colNumero}>
                      {esUltima ? (
                        <span className={styles.celdaResto}>
                          <span className={sinCuenta ? styles.celdaAtenuada : styles.celdaCalculada}>
                            {formatARS(resuelta?.baseArs ?? 0)}
                          </span>
                          <span
                            className={styles.chipResto}
                            title={leyendaResto}
                          >
                            resto
                          </span>
                        </span>
                      ) : (
                        <>
                          {modo !== 'derivado' && unidad !== 'monto' ? (
                            <span className={styles.celdaCalculada}>
                              {formatARS(resuelta?.baseArs ?? 0)}
                            </span>
                          ) : (
                            <input
                              className={errorBase ? styles.inputError : styles.inputNumero}
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              aria-label={`Base de la fila ${index + 1}`}
                              value={fila.baseArs ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                editarBase(index, v === '' ? undefined : Number(v));
                              }}
                            />
                          )}
                          {errorBase && <span className={styles.errorCampo}>{errorBase}</span>}
                        </>
                      )}
                    </td>

                    <td className={`${styles.colNumero} ${styles.celdaCalculada}`}>
                      {!sinCuenta && resuelta && resuelta.tasa > 0
                        ? formatARS(resuelta.recargoArs)
                        : '—'}
                    </td>

                    <td className={`${styles.colNumero} ${styles.celdaDebita}`}>
                      {sinCuenta ? '—' : formatARS(resuelta?.debitaArs ?? 0)}
                    </td>

                    <td className={styles.colAccion}>
                      <span className={styles.celdaAccion}>
                        {(filas.length > 1 || modo === 'derivado') && (
                          <IconButton
                            icon={<Trash2 size={15} />}
                            label={`Quitar la fila ${index + 1}`}
                            onClick={() => quitarFila(index)}
                          />
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className={styles.filaAgregar}>
                <td colSpan={modo === 'dividido' && unidad === 'porcentaje' ? 6 : 5}>
                  <button type="button" className={styles.botonAgregar} onClick={agregarFila}>
                    <Plus size={14} aria-hidden="true" />
                    Agregar cuenta
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {errores.pago && <p className={styles.errorBloque}>{errores.pago}</p>}
        </>
      )}
    </div>
  );
}
