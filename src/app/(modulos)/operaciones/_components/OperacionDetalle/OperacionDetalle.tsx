'use client';

import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import { OperacionItem, OperacionCuentaDistribucion } from '../../../../../lib/types/OperacionDetalle';
import { useOperacionDetalle } from '../../_hooks/useOperacionDetalle';
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

export default function OperacionDetalle({ operacionId }: OperacionDetalleProps) {
  const router = useRouter();
  const { operacion, isLoading, error, reload } = useOperacionDetalle(operacionId);

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

  const cuentaColumns: TableColumn<OperacionCuentaDistribucion>[] = [
    {
      key: 'cuenta',
      header: 'Cuenta bancaria / financiera',
      render: (c) => <span className={styles.productoNombre}>{c.cuentaNombre}</span>,
    },
    {
      key: 'porcentaje',
      header: '% Asignado',
      render: (c) => (
        <span className={styles.porcentajeBadge}>{formatPorcentaje(c.porcentaje)}</span>
      ),
    },
    {
      key: 'monto',
      header: 'Monto',
      render: (c) => <span className={styles.montoCell}>{formatMonto(c.monto)}</span>,
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
          </div>
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

      {/* Desglose de elementos / productos involucrados */}
      <Card title="Desglose de elementos involucrados">
        <Table
          columns={itemColumns}
          data={operacion.items}
          getRowKey={(it) => it.id}
          emptyMessage="No hay elementos o productos desglosados en esta operación."
        />
      </Card>

      {/* Cuentas bancarias / financieras involucradas */}
      <Card title="Cuentas bancarias y financieras involucradas">
        {operacion.cuentas.length > 0 ? (
          <div className={styles.cuentasGrid}>
            {operacion.cuentas.map((c) => (
              <div key={c.id} className={styles.cuentaCard}>
                <div className={styles.cuentaHeader}>
                  <span className={styles.cuentaNombre}>{c.cuentaNombre}</span>
                  <span className={styles.porcentajeBadge}>{formatPorcentaje(c.porcentaje)}</span>
                </div>
                <span className={styles.cuentaMonto}>{formatMonto(c.monto)}</span>
              </div>
            ))}
          </div>
        ) : (
          <Table
            columns={cuentaColumns}
            data={operacion.cuentas}
            getRowKey={(c) => c.id}
            emptyMessage="No hay cuentas financieras registradas para esta operación."
          />
        )}
      </Card>
    </div>
  );
}
