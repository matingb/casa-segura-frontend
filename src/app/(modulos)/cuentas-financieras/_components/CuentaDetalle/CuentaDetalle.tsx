'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import { MovimientoCuenta } from '../../../../../lib/types/MovimientoCuenta';
import { useCuentaDetalle } from '../../_hooks/useCuentaDetalle';
import { formatFecha, formatMonto, formatPorcentaje } from '../../../../../lib/utils/formatters';
import styles from './CuentaDetalle.module.css';

interface CuentaDetalleProps {
  cuentaId: string;
}

export default function CuentaDetalle({ cuentaId }: CuentaDetalleProps) {
  const router = useRouter();
  const { cuenta, movimientos, isLoading, error, reload } = useCuentaDetalle(cuentaId);

  const columns: TableColumn<MovimientoCuenta>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (m) => <span className={styles.fechaCell}>{formatFecha(m.fecha)}</span>,
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (m) => (
        <div className={styles.descripcionCell}>
          <span className={styles.descripcionText}>{m.descripcion || '—'}</span>
          {m.operacionId && (
            <Link
              href={`/operaciones/${m.operacionId}`}
              className={styles.operacionLink}
              title={`Ver detalle de operación (${m.operacionId})`}
            >
              Ver operación →
            </Link>
          )}
        </div>
      ),
    },

    {
      key: 'monto',
      header: 'Monto',
      render: (m) => (
        <span className={styles.montoCell}>
          {formatMonto(m.monto)}
        </span>
      ),
    },
  ];


  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrapper}>
          <span className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Cargando información de la cuenta...</p>
        </div>
      </div>
    );
  }

  if (error || !cuenta) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.push('/cuentas-financieras')}
          >
            ← Volver a cuentas financieras
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
            <p className={styles.notFoundTitle}>Cuenta financiera no encontrada</p>
            <Button variant="primary" onClick={() => router.push('/cuentas-financieras')}>
              Volver al listado
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.push('/cuentas-financieras')}
          >
            ← Volver a cuentas financieras
          </button>
          <h1 className={styles.title}>{cuenta.nombre}</h1>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            onClick={() => router.push(`/cuentas-financieras/${cuenta.id}/editar`)}
          >
            Editar cuenta
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Saldo actual</span>
          <span
            className={`${styles.summaryValue} ${
              cuenta.saldoActual >= 0 ? styles.montoPositivo : styles.montoNegativo
            }`}
          >
            {formatMonto(cuenta.saldoActual)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Saldo inicial</span>
          <span className={styles.summaryValue}>{formatMonto(cuenta.saldoInicial)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>% Extra</span>
          <span className={styles.summaryValue}>{formatPorcentaje(cuenta.porcentajeExtra)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total movimientos</span>
          <span className={styles.summaryValue}>{movimientos.length}</span>
        </div>
      </div>

      {/* Movements Table */}
      <Card title="Historial de movimientos">
        <Table
          columns={columns}
          data={movimientos}
          getRowKey={(m) => m.id}
          emptyMessage="No hay movimientos registrados para esta cuenta financiera."
        />
      </Card>
    </div>
  );
}
