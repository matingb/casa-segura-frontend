'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Eye } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import IconButton from '../../../../../components/ui/IconButton/IconButton';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar from '../../../../../components/ui/FilterBar/FilterBar';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';
import { useCuentasFinancieras } from '../../_hooks/useCuentasFinancieras';
import { formatMonto, formatPorcentaje } from '../../../../../lib/utils/formatters';
import styles from './CuentasCatalogo.module.css';

const FILTER_FIELDS: { key: string; label: string; type?: 'text' | 'select' }[] = [
  { key: 'nombre', label: 'Nombre', type: 'text' },
];


export default function CuentasCatalogo() {
  const router = useRouter();
  const {
    cuentas,
    isLoading,
    totalSaldoActual,
    sort,
    onSortChange,
    filters,
    onFilterChange,
  } = useCuentasFinancieras();

  const columns: TableColumn<CuentaFinanciera>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (c) => (
        <button
          type="button"
          className={styles.nombreLink}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/cuentas-financieras/${c.id}`);
          }}
        >
          {c.nombre}
        </button>
      ),
      sortable: true,
    },
    {
      key: 'saldoInicial',
      header: 'Saldo inicial',
      render: (c) => (
        <span className={styles.montoCell}>{formatMonto(c.saldoInicial)}</span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
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
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'porcentajeExtra',
      header: '% Extra',
      render: (c) => (
        <span className={styles.porcentajeCell}>
          {formatPorcentaje(c.porcentajeExtra)}
        </span>
      ),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'acciones',
      header: '',
      render: (c) => (
        <div className={styles.rowActions}>
          <IconButton
            icon={<Eye size={16} />}
            label="Ver detalle"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/cuentas-financieras/${c.id}`);
            }}
          />
          <IconButton
            icon={<Pencil size={16} />}
            label="Editar"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/cuentas-financieras/${c.id}/editar`);
            }}
          />
        </div>
      ),
      align: 'right',
      width: '1%',
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
          <FilterBar
            fields={FILTER_FIELDS}
            filters={filters}
            onFilterChange={onFilterChange}
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
            sort={sort}
            onSortChange={onSortChange}
            onRowClick={(c) => router.push(`/cuentas-financieras/${c.id}`)}
            stickyHeader
          />
        )}
      </Card>
    </div>
  );
}
