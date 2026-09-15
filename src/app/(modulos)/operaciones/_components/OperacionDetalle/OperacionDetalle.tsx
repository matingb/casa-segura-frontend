'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import { OperacionCuentaDistribucion, OperacionItem } from '../../../../../lib/types/OperacionDetalle';
import { useOperacionDetalle } from '../../_hooks/useOperacionDetalle';
import { operacionesClient } from '../../../../../lib/api/operaciones.client';
import { useToast } from '../../../../../context/ToastContext';
import ConfirmActionModal from '../../../../../components/ui/ConfirmActionModal/ConfirmActionModal';
import RegistrarPagoModal from './RegistrarPagoModal';
import { formatFecha, formatMonto, formatPorcentaje } from '../../../../../lib/utils/formatters';
import styles from './OperacionDetalle.module.css';

interface OperacionDetalleProps {
  operacionId: string;
}

function getTipoVariant(tipoNombre: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const lower = tipoNombre.toLowerCase();
  if (lower.includes('venta') || lower.includes('ingreso')) return 'success';
  if (lower.includes('compra') || lower.includes('egreso') || lower.includes('gasto')) return 'danger';
  if (lower.includes('traslado') || lower.includes('transferencia')) return 'warning';
  return 'neutral';
}

function etiquetaEstadoFinanciero(estado: string | undefined, tipoNombre: string): string | null {
  if (!estado) return null;
  const esCompra = tipoNombre.toLowerCase() === 'compra';
  const etiquetas: Record<string, string> = esCompra
    ? { PENDIENTE: 'Pendiente de pago', PARCIAL: 'Pago parcial', SALDADA: 'Pagada', SOBREPAGADA: 'Sobrepagada' }
    : { PENDIENTE: 'Pendiente de cobro', PARCIAL: 'Cobro parcial', SALDADA: 'Cobrada', SOBREPAGADA: 'Sobrecobrada' };
  return etiquetas[estado] ?? estado;
}

function varianteEstadoFinanciero(estado: string | undefined): 'success' | 'danger' | 'warning' | 'neutral' {
  if (estado === 'SALDADA') return 'success';
  if (estado === 'SOBREPAGADA') return 'danger';
  if (estado === 'PENDIENTE' || estado === 'PARCIAL') return 'warning';
  return 'neutral';
}

export default function OperacionDetalle({ operacionId }: OperacionDetalleProps) {
  const router = useRouter();
  const { operacion, isLoading, error, reload } = useOperacionDetalle(operacionId);
  const { showError, showSuccess } = useToast();
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showRegistrarPago, setShowRegistrarPago] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [pagoAEliminar, setPagoAEliminar] = useState<OperacionCuentaDistribucion | null>(null);
  const [isDeletingPago, setIsDeletingPago] = useState(false);

  const handleCancel = async () => {
    if (isCancelling) return;
    try {
      setIsCancelling(true);
      await operacionesClient.cancelar(operacionId);
      showSuccess('Operación cancelada correctamente. Se revirtieron sus movimientos.');
      router.push('/operaciones');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo cancelar la operación.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePagoRegistrado = async () => {
    await reload();
    setShowRegistrarPago(false);
    showSuccess(operacion?.tipoNombre.toLowerCase() === 'compra' ? 'Pago registrado correctamente.' : 'Cobro registrado correctamente.');
  };

  const handleEliminarPago = async () => {
    if (!pagoAEliminar || isDeletingPago) return;
    try {
      setIsDeletingPago(true);
      await operacionesClient.eliminarPago(operacionId, pagoAEliminar.id);
      await reload();
      setPagoAEliminar(null);
      showSuccess(operacion?.tipoNombre === 'Compra' ? 'Pago eliminado correctamente.' : 'Cobro eliminado correctamente.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'No se pudo eliminar el pago/cobro.');
    } finally {
      setIsDeletingPago(false);
    }
  };

  const itemColumns: TableColumn<OperacionItem>[] = [
    {
      key: 'producto',
      header: 'Producto / Elemento',
      render: (item) => (
        <div className={styles.productoCell}>
          <span className={styles.productoNombre}>{item.productoNombre}</span>
          <span className={styles.productoSubtext}>
            {item.productoCodigo}
            {item.productoMarca ? ` · ${item.productoMarca}` : ''}
            {item.productoModelo ? ` (${item.productoModelo})` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      render: (item) => <span className={styles.numCell}>{item.cantidad}</span>,
    },
    {
      key: 'precioUnitario',
      header: 'Precio Unitario',
      render: (item) => <span className={styles.numCell}>{formatMonto(item.precioUnitario)}</span>,
    },
    {
      key: 'alicuotaIva',
      header: 'IVA (%)',
      render: (item) => <span className={styles.numCell}>{formatPorcentaje(item.alicuotaIva)}</span>,
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (item) => <span className={styles.montoCell}>{formatMonto(item.subtotal)}</span>,
    },
  ];

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrapper}>
          <span className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Cargando detalle de la operación...</p>
        </div>
      </div>
    );
  }

  if (error || !operacion) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.push('/operaciones')}
          >
            ← Volver a operaciones
          </button>
        </div>
        {error ? (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            <Button variant="secondary" onClick={() => reload()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div className={styles.notFoundWrapper}>
            <p className={styles.notFoundTitle}>Operación no encontrada</p>
            <Button variant="primary" onClick={() => router.push('/operaciones')}>
              Volver al listado
            </Button>
          </div>
        )}
      </div>
    );
  }

  const esOperacionComercial = operacion.tipoNombre === 'Compra' || operacion.tipoNombre === 'Venta';
  const puedeRegistrarPago = esOperacionComercial
    && !operacion.cancelledAt
    && operacion.estadoFinanciero !== 'SALDADA'
    && operacion.estadoFinanciero !== 'SOBREPAGADA';
  const etiquetaEstado = etiquetaEstadoFinanciero(operacion.estadoFinanciero, operacion.tipoNombre);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.push('/operaciones')}
          >
            ← Volver a operaciones
          </button>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Operación #{operacion.id.slice(0, 8)}</h1>
            <Badge variant={getTipoVariant(operacion.tipoNombre)}>
              {operacion.tipoNombre}
            </Badge>
            {etiquetaEstado && <Badge variant={varianteEstadoFinanciero(operacion.estadoFinanciero)}>{etiquetaEstado}</Badge>}
            {operacion.cancelledAt && <Badge variant="danger">Cancelada</Badge>}
          </div>
        </div>
        <div className={styles.actions}>
          {puedeRegistrarPago && (
            <Button type="button" variant="primary" onClick={() => setShowRegistrarPago(true)}>
              {operacion.tipoNombre === 'Compra' ? 'Registrar pago' : 'Registrar cobro'}
            </Button>
          )}
          {!operacion.cancelledAt && (
            <Button type="button" variant="danger" onClick={() => setShowCancelConfirmation(true)}>
              Cancelar operación
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total operación</span>
          <span className={`${styles.summaryValue} ${styles.montoTotal}`}>
            {formatMonto(operacion.total)}
          </span>
        </div>
        {esOperacionComercial && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>{operacion.tipoNombre === 'Compra' ? 'Saldo pendiente de pago' : 'Saldo pendiente de cobro'}</span>
            <span className={`${styles.summaryValue} ${styles.montoTotal}`}>
              {formatMonto(operacion.saldoPendiente ?? Math.max(0, operacion.total - (operacion.montoPagado ?? 0)))}
            </span>
          </div>
        )}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Fecha</span>
          <span className={styles.summaryValue}>{formatFecha(operacion.fecha)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Sucursal</span>
          <span className={styles.summaryValue}>{operacion.sucursalNombre || '—'}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Operador</span>
          <span className={styles.summaryValue}>{operacion.usuarioNombre || '—'}</span>
        </div>
      </div>

      {/* Extra context if present (Proveedor, Factura, Destino, Movimiento) */}
      {(operacion.proveedorNombre || operacion.numeroFactura || operacion.sucursalDestinoNombre || operacion.movimientoDescripcion) && (
        <Card title="Información adicional">
          <div className={styles.extraDetails}>
            {operacion.proveedorNombre && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Proveedor</span>
                <span className={styles.detailValue}>{operacion.proveedorNombre}</span>
              </div>
            )}
            {operacion.numeroFactura && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Factura</span>
                <span className={styles.detailValue}>{operacion.numeroFactura}</span>
              </div>
            )}
            {operacion.numeroRemito && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Remito</span>
                <span className={styles.detailValue}>{operacion.numeroRemito}</span>
              </div>
            )}
            {operacion.sucursalDestinoNombre && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Sucursal destino</span>
                <span className={styles.detailValue}>{operacion.sucursalDestinoNombre}</span>
              </div>
            )}
            {operacion.movimientoDescripcion && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Descripción del movimiento</span>
                <span className={styles.detailValue}>{operacion.movimientoDescripcion}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Desglose de productos: los movimientos financieros no tienen ítems. */}
      {operacion.items.length > 0 && (
        <Card title="Desglose de elementos involucrados">
          <Table
            columns={itemColumns}
            data={operacion.items}
            getRowKey={(it) => it.id}
            emptyMessage="No hay elementos o productos desglosados en esta operación."
          />
        </Card>
      )}

      {/* Cuentas bancarias / financieras involucradas */}
      {(operacion.cuentas.length > 0 || esOperacionComercial) && (
        <Card title={esOperacionComercial ? 'Historial de pagos y cobros' : 'Cuentas bancarias y financieras involucradas'}>
          {esOperacionComercial && (
            <div className={styles.finanzasResumen}>
              <span>{operacion.tipoNombre === 'Compra' ? 'Pagado' : 'Cobrado'}: <strong>{formatMonto(operacion.montoPagado ?? 0)}</strong></span>
              <span>Saldo pendiente: <strong>{formatMonto(operacion.saldoPendiente ?? Math.max(0, operacion.total - (operacion.montoPagado ?? 0)))}</strong></span>
            </div>
          )}
          {operacion.cuentas.length > 0 ? (
            <div className={styles.cuentasGrid}>
            {operacion.cuentas.map((c) => (
              <div key={c.id} className={styles.cuentaCard}>
                <div className={styles.cuentaHeader}>
                  <span className={styles.cuentaNombre}>{c.cuentaNombre}</span>
                  <div className={styles.cuentaAcciones}>
                    <span className={styles.porcentajeBadge}>{formatPorcentaje(c.porcentaje)}</span>
                    {esOperacionComercial && !operacion.cancelledAt && (
                      <Button
                        type="button"
                        variant="danger"
                        className={styles.eliminarPagoButton}
                        onClick={() => setPagoAEliminar(c)}
                        aria-label={`Eliminar ${operacion.tipoNombre === 'Compra' ? 'pago' : 'cobro'} de ${formatMonto(c.monto)} en ${c.cuentaNombre}`}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
                <span className={styles.cuentaMonto}>{formatMonto(c.monto)}</span>
                {c.porcentajeExtra ? (
                  <span className={styles.cuentaRecargo}>
                    incluye {formatPorcentaje(c.porcentajeExtra)} de recargo
                  </span>
                ) : null}
                {c.fechaEfectiva && <span className={styles.cuentaFecha}>{formatFecha(c.fechaEfectiva)}</span>}
                {c.observacion && <span className={styles.cuentaObservacion}>{c.observacion}</span>}
              </div>
            ))}
            </div>
          ) : (
            <p className={styles.sinMovimientos}>Todavía no hay pagos/cobros registrados para esta operación.</p>
          )}
        </Card>
      )}
      {showCancelConfirmation && (
        <ConfirmActionModal
          title="Cancelar operación"
          description="La cancelación revertirá el stock y los saldos asociados usando los datos originales de la operación. Esta acción no puede deshacerse desde la interfaz."
          confirmLabel="Cancelar operación"
          isConfirming={isCancelling}
          onConfirm={handleCancel}
          onClose={() => setShowCancelConfirmation(false)}
        />
      )}
      {showRegistrarPago && (
        <RegistrarPagoModal
          operacion={operacion}
          onClose={() => setShowRegistrarPago(false)}
          onRegistered={handlePagoRegistrado}
        />
      )}
      {pagoAEliminar && (
        <ConfirmActionModal
          title={`Eliminar ${operacion.tipoNombre === 'Compra' ? 'pago' : 'cobro'}`}
          description={`Se eliminará ${formatMonto(pagoAEliminar.monto)} de ${pagoAEliminar.cuentaNombre}. Se revertirá el saldo de la cuenta y se recalculará el estado financiero de la operación.`}
          confirmLabel={`Eliminar ${operacion.tipoNombre === 'Compra' ? 'pago' : 'cobro'}`}
          isConfirming={isDeletingPago}
          onConfirm={handleEliminarPago}
          onClose={() => setPagoAEliminar(null)}
        />
      )}
    </div>
  );
}
