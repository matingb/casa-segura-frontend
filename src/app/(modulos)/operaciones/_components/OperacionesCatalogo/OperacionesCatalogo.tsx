'use client';

import Card from '../../../../../components/ui/Card/Card';
import Badge from '../../../../../components/ui/Badge/Badge';
import Input from '../../../../../components/ui/Input/Input';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import Dropdown from '../../../../../components/ui/Dropdown/Dropdown';
import { Operacion } from '../../../../../lib/types/Operacion';
import { useOperacionesFiltrado } from '../../_hooks/useOperacionesFiltrado';
import styles from './OperacionesCatalogo.module.css';

function formatFecha(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(monto);
}

function getTipoVariant(tipoNombre: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const lower = tipoNombre.toLowerCase();
  if (lower.includes('venta') || lower.includes('ingreso')) return 'success';
  if (lower.includes('egreso') || lower.includes('gasto') || lower.includes('devolucion') || lower.includes('devolución')) return 'danger';
  if (lower.includes('ajuste') || lower.includes('transferencia')) return 'warning';
  return 'neutral';
}

export default function OperacionesCatalogo() {
  const {
    operaciones,
    isLoading,
    busqueda,
    setBusqueda,
    sucursalId,
    setSucursalId,
    tipoId,
    setTipoId,
    sucursalOptions,
    tipoOptions,
    totalMonto,
  } = useOperacionesFiltrado();

  const columns: TableColumn<Operacion>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (op) => <span className={styles.fechaCell}>{formatFecha(op.fecha)}</span>,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (op) => (
        <Badge variant={getTipoVariant(op.tipoNombre)}>{op.tipoNombre || '—'}</Badge>
      ),
    },
    {
      key: 'sucursal',
      header: 'Sucursal',
      render: (op) => op.sucursalNombre || '—',
    },
    {
      key: 'usuario',
      header: 'Usuario',
      render: (op) => <span className={styles.usuarioCell}>{op.usuarioNombre || '—'}</span>,
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (op) => (
        <span className={styles.descripcionCell} title={op.descripcion}>
          {op.descripcion || '—'}
        </span>
      ),
    },
    {
      key: 'monto',
      header: 'Monto',
      render: (op) => (
        <span className={`${styles.montoCell} ${op.monto < 0 ? styles.montoNegativo : styles.montoPositivo}`}>
          {formatMonto(op.monto)}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      {/* Tarjeta de resumen */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total operaciones</span>
          <span className={styles.summaryValue}>{operaciones.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Monto total (filtrado)</span>
          <span className={`${styles.summaryValue} ${totalMonto < 0 ? styles.montoNegativo : styles.montoPositivo}`}>
            {formatMonto(totalMonto)}
          </span>
        </div>
      </div>

      <Card title="Historial de operaciones">
        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <Input
              placeholder="Buscar por tipo, usuario, sucursal, descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className={styles.filters}>
            <Dropdown
              id="filtro-sucursal"
              label="Sucursal"
              options={sucursalOptions}
              value={sucursalId}
              onChange={setSucursalId}
            />
            <Dropdown
              id="filtro-tipo"
              label="Tipo"
              options={tipoOptions}
              value={tipoId}
              onChange={setTipoId}
            />
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingWrapper}>
            <span className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Cargando operaciones...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={operaciones}
            getRowKey={(op) => op.id}
            emptyMessage="No se encontraron operaciones con los filtros aplicados."
          />
        )}
      </Card>
    </div>
  );
}
