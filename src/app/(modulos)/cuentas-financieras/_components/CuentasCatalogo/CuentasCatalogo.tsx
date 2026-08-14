'use client';

import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Input from '../../../../../components/ui/Input/Input';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';
import { useCuentasFinancieras } from '../../_hooks/useCuentasFinancieras';
import { formatMonto, formatPorcentaje } from '../../../../../lib/utils/formatters';
import styles from './CuentasCatalogo.module.css';


export default function CuentasCatalogo() {
  const router = useRouter();
  const { cuentas, isLoading, busqueda, setBusqueda, totalSaldoActual } =
    useCuentasFinancieras();

  const columns: TableColumn<CuentaFinanciera>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (c) => <span className={styles.nombreCell}>{c.nombre}</span>,
    },
    {
      key: 'saldoInicial',
      header: 'Saldo inicial',
      render: (c) => (
        <span className={styles.montoCell}>{formatMonto(c.saldoInicial)}</span>
      ),
    },
    {
      key: 'saldoActual',
      header: 'Saldo actual',
      render: (c) => (
        <span
          className={`${styles.montoCell} ${
            c.saldoActual >= 0 ? styles.montoPositivo : styles.montoNegativo
          }`}
        >
          {formatMonto(c.saldoActual)}
        </span>
      ),
    },
    {
      key: 'porcentajeExtra',
      header: '% Extra',
      render: (c) => (
        <span className={styles.porcentajeCell}>
          {formatPorcentaje(c.porcentajeExtra)}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (c) => (
        <div className={styles.rowActions}>
          <Button
            variant="secondary"
            onClick={() => router.push(`/cuentas-financieras/${c.id}/editar`)}
          >
            Editar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total de cuentas</span>
          <span className={styles.summaryValue}>{cuentas.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Saldo total (filtrado)</span>
          <span
            className={`${styles.summaryValue} ${
              totalSaldoActual >= 0 ? styles.montoPositivo : styles.montoNegativo
            }`}
          >
            {formatMonto(totalSaldoActual)}
          </span>
        </div>
      </div>

      <Card
        title="Cuentas financieras"
        actions={
          <Button
            variant="primary"
            onClick={() => router.push('/cuentas-financieras/nueva')}
          >
            + Nueva cuenta
          </Button>
        }
      >
        <div className={styles.toolbar}>
          <Input
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className={styles.loadingWrapper}>
            <span className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Cargando cuentas...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={cuentas}
            getRowKey={(c) => c.id}
            emptyMessage="No se encontraron cuentas financieras."
          />
        )}
      </Card>
    </div>
  );
}
