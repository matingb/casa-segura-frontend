'use client';

import { FormEvent, useMemo, useState } from 'react';
import Button from '../../../../../components/ui/Button/Button';
import Input from '../../../../../components/ui/Input/Input';
import Modal from '../../../../../components/ui/Modal/Modal';
import { operacionesClient } from '../../../../../lib/api/operaciones.client';
import { OperacionDetalle } from '../../../../../lib/types/OperacionDetalle';
import { formatFecha } from '../../../../../lib/utils/formatters';
import styles from './RegistrarImpactoStockModal.module.css';

interface RegistrarImpactoStockModalProps {
  operacion: OperacionDetalle;
  onClose: () => void;
  onRegistered: () => Promise<void> | void;
}

export default function RegistrarImpactoStockModal({
  operacion,
  onClose,
  onRegistered,
}: RegistrarImpactoStockModalProps) {
  const esCompra = operacion.tipoNombre === 'Compra';
  const accion = esCompra ? 'ingreso' : 'salida';
  const pendientes = useMemo(
    () => operacion.items.filter((item) => (item.cantidadPendienteStock ?? 0) > 0),
    [operacion.items]
  );
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const totalAImpactar = pendientes.reduce((total, item) => total + (Number(cantidades[item.id]) || 0), 0);

  const errorCantidad = (item: typeof pendientes[number], valor: string): string | null => {
    if (valor === '') return null;

    const cantidad = Number(valor);
    const pendiente = item.cantidadPendienteStock ?? 0;
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      return `La cantidad para ${item.productoNombre} debe ser un entero mayor o igual a cero.`;
    }
    if (cantidad > pendiente) {
      return `La cantidad para ${item.productoNombre} no puede superar las ${pendiente} unidades pendientes.`;
    }
    return null;
  };

  const hayCantidadInvalida = pendientes.some((item) => errorCantidad(item, cantidades[item.id] ?? '') !== null);

  const handleCantidadChange = (item: typeof pendientes[number], valor: string) => {
    const siguientesCantidades = { ...cantidades, [item.id]: valor };
    const itemInvalido = pendientes.find((pendiente) =>
      errorCantidad(pendiente, siguientesCantidades[pendiente.id] ?? '') !== null
    );

    setCantidades(siguientesCantidades);
    setError(itemInvalido
      ? errorCantidad(itemInvalido, siguientesCantidades[itemInvalido.id] ?? '')!
      : '');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const items = pendientes
      .map((item) => ({ item, cantidad: Number(cantidades[item.id] || 0) }))
      .filter(({ cantidad }) => cantidad > 0);

    if (items.length === 0) {
      setError('Indicá una cantidad mayor a cero en al menos una línea.');
      return;
    }
    for (const { item, cantidad } of items) {
      if (!Number.isInteger(cantidad) || cantidad > (item.cantidadPendienteStock ?? 0)) {
        setError(`La cantidad para ${item.productoNombre} debe ser un entero y no superar lo pendiente.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');
      await operacionesClient.registrarImpactoStock(operacion.id, {
        items: items.map(({ item, cantidad }) => ({ operacionDetalleId: item.id, cantidad })),
      });
      await onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo registrar la ${accion} de stock.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Registrar ${accion} de stock`}
      onClose={onClose}
      size="wide"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" form="registrar-impacto-stock-form" disabled={submitting || totalAImpactar <= 0 || hayCantidadInvalida}>
            {submitting ? 'Guardando...' : `Registrar ${accion}`}
          </Button>
        </>
      }
    >
      <form id="registrar-impacto-stock-form" className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.intro}>
          Indicá solo las unidades que {esCompra ? 'ingresaron' : 'salieron'} físicamente ahora. El resto seguirá pendiente.
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Total</th>
                <th>Impactado</th>
                <th>Pendiente</th>
                <th>Última modificación</th>
                <th>Cantidad a impactar ahora</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((item) => {
                const pendiente = item.cantidadPendienteStock ?? 0;
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.productoNombre}</strong>
                      {item.productoCodigo && <span className={styles.codigo}>{item.productoCodigo}</span>}
                    </td>
                    <td>{item.cantidad}</td>
                    <td>{item.cantidadImpactadaStock ?? 0}</td>
                    <td>{pendiente}</td>
                    <td>{item.ultimaModificacionStock ? formatFecha(item.ultimaModificacionStock) : 'Sin impactos'}</td>
                    <td>
                      <Input
                        label=""
                        aria-label={`Cantidad a impactar de ${item.productoNombre}`}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max={pendiente}
                        step="1"
                        value={cantidades[item.id] ?? ''}
                        aria-invalid={errorCantidad(item, cantidades[item.id] ?? '') ? true : undefined}
                        onChange={(event) => handleCantidadChange(item, event.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
