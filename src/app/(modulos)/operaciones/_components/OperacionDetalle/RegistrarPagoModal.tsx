'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Button from '../../../../../components/ui/Button/Button';
import Input from '../../../../../components/ui/Input/Input';
import Modal from '../../../../../components/ui/Modal/Modal';
import Select from '../../../../../components/ui/Select/Select';
import { cuentaFinancieraClient } from '../../../../../lib/api/cuenta-financiera.client';
import { operacionesClient } from '../../../../../lib/api/operaciones.client';
import { OperacionDetalle } from '../../../../../lib/types/OperacionDetalle';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';
import { formatMonto } from '../../../../../lib/utils/formatters';
import styles from './RegistrarPagoModal.module.css';

interface RegistrarPagoModalProps {
  operacion: OperacionDetalle;
  onClose: () => void;
  onRegistered: () => Promise<void> | void;
}

interface PagoLinea {
  id: number;
  cuentaId: string;
  monto: string;
  fechaEfectiva: string;
  observacion: string;
}

function fechaLocalActual(): string {
  const ahora = new Date();
  const ajuste = ahora.getTimezoneOffset() * 60_000;
  return new Date(ahora.getTime() - ajuste).toISOString().slice(0, 10);
}

export default function RegistrarPagoModal({ operacion, onClose, onRegistered }: RegistrarPagoModalProps) {
  const esCompra = operacion.tipoNombre.toLowerCase() === 'compra';
  const accion = esCompra ? 'pago' : 'cobro';
  const verboAccion = esCompra ? 'Pagar' : 'Cobrar';
  const saldoPendiente = operacion.saldoPendiente ?? Math.max(0, operacion.total - (operacion.montoPagado ?? 0));
  const [cuentas, setCuentas] = useState<CuentaFinanciera[]>([]);
  const [lineas, setLineas] = useState<PagoLinea[]>([{
    id: 0,
    cuentaId: '',
    monto: saldoPendiente > 0 ? String(saldoPendiente) : '',
    fechaEfectiva: fechaLocalActual(),
    observacion: '',
  }]);
  const [siguienteLineaId, setSiguienteLineaId] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cuentaFinancieraClient.obtenerTodas().then(setCuentas).catch(() => {
      setError('No se pudieron cargar las cuentas financieras.');
    });
  }, []);

  const totalIngresado = useMemo(
    () => lineas.reduce((total, linea) => total + (Number(linea.monto) || 0), 0),
    [lineas]
  );

  const actualizarLinea = (id: number, cambios: Partial<Omit<PagoLinea, 'id'>>) => {
    setLineas((actuales) => actuales.map((linea) => linea.id === id ? { ...linea, ...cambios } : linea));
  };

  const agregarLinea = () => {
    setLineas((actuales) => [...actuales, {
      id: siguienteLineaId,
      cuentaId: '',
      monto: '',
      fechaEfectiva: fechaLocalActual(),
      observacion: '',
    }]);
    setSiguienteLineaId((actual) => actual + 1);
  };

  const quitarLinea = (id: number) => {
    setLineas((actuales) => actuales.length > 1 ? actuales.filter((linea) => linea.id !== id) : actuales);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    for (const linea of lineas) {
      if (!linea.cuentaId) {
        setError('Elegí una cuenta financiera en cada movimiento.');
        return;
      }
      if (!(Number(linea.monto) > 0)) {
        setError(`Ingresá un monto válido para cada ${accion}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');
      await operacionesClient.registrarPago(operacion.id, {
        cuentas: lineas.map((linea) => ({
          cuentaFinancieraId: linea.cuentaId,
          montoArs: Number(linea.monto),
          fechaEfectiva: linea.fechaEfectiva,
          observacion: linea.observacion,
        })),
      });
      await onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo registrar el ${accion}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Gestión de ${esCompra ? 'pagos' : 'cobros'}`}
      onClose={onClose}
      size="wide"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" form="registrar-pago-form" disabled={submitting || totalIngresado <= 0}>
            {submitting ? 'Guardando...' : `${verboAccion} ${formatMonto(totalIngresado)}`}
          </Button>
        </>
      }
    >
      <form id="registrar-pago-form" className={styles.form} onSubmit={handleSubmit}>
        <dl className={styles.resumen}>
          <div><dt>Total {esCompra ? 'compra' : 'venta'}</dt><dd>{formatMonto(operacion.total)}</dd></div>
          <div><dt>{esCompra ? 'Pagado' : 'Cobrado'}</dt><dd className={styles.cobrado}>{formatMonto(operacion.montoPagado ?? 0)}</dd></div>
          <div><dt>Saldo pendiente</dt><dd className={styles.saldo}>{formatMonto(saldoPendiente)}</dd></div>
        </dl>

        <div className={styles.sectionHeader}>
          <h2>Registrar {accion}</h2>
          <span>Total ingresado: {formatMonto(totalIngresado)}</span>
        </div>

        <div className={styles.movimientos}>
          {lineas.map((linea, index) => (
            <section className={styles.movimiento} key={linea.id}>
              <div className={styles.camposMovimiento}>
                <Select
                  label=""
                  aria-label={`Cuenta financiera ${index + 1}`}
                  value={linea.cuentaId}
                  onChange={(event) => actualizarLinea(linea.id, { cuentaId: event.target.value })}
                >
                  <option value="">Seleccionar cuenta</option>
                  {cuentas.map((cuenta) => <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>)}
                </Select>
                <Input
                  label=""
                  aria-label={`Monto del ${accion} ${index + 1}`}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={linea.monto}
                  onChange={(event) => actualizarLinea(linea.id, { monto: event.target.value })}
                />
                <Input
                  label=""
                  aria-label={`Fecha efectiva ${index + 1}`}
                  type="date"
                  value={linea.fechaEfectiva}
                  onChange={(event) => actualizarLinea(linea.id, { fechaEfectiva: event.target.value })}
                />
                <button
                  type="button"
                  className={styles.quitarMovimiento}
                  onClick={() => quitarLinea(linea.id)}
                  disabled={lineas.length === 1}
                  aria-label={`Quitar movimiento ${index + 1}`}
                  title="Quitar movimiento"
                >
                  ×
                </button>
              </div>
              <label className={styles.observacionLabel}>
                <span className={styles.srOnly}>Concepto o nota</span>
                <textarea
                  value={linea.observacion}
                  onChange={(event) => actualizarLinea(linea.id, { observacion: event.target.value })}
                  placeholder="Concepto o nota (opcional)..."
                  rows={2}
                />
              </label>
            </section>
          ))}
        </div>

        <button type="button" className={styles.agregarMovimiento} onClick={agregarLinea}>
          + Añadir otra cuenta
        </button>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
