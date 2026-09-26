'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Eye } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import IconButton from '../../../../../components/ui/IconButton/IconButton';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import FilterBar from '../../../../../components/ui/FilterBar/FilterBar';
import Pagination from '../../../../../components/ui/Pagination/Pagination';
import { Cliente, TIPOS_CLIENTE, tipoClienteLabel } from '../../../../../lib/types/Cliente';
import { clienteClient } from '../../../../../lib/api/cliente.client';
import { useCatalogoPaginado } from '../../../../../lib/hooks/useTableQuery';
import { formatPorcentaje } from '../../../../../lib/utils/formatters';
import styles from './ClientesCatalogo.module.css';

const SELECT_FILTER_FIELDS = ['condicionIva', 'provincia', 'sucursal', 'estado'] as const;

const FILTER_FIELDS: { key: string; label: string; type?: 'text' | 'select'; options?: { value: string; label: string }[] }[] = [
  { key: 'tipoCliente', label: 'Tipo', options: TIPOS_CLIENTE },
  { key: 'condicionIva', label: 'Condición IVA' },
  { key: 'provincia', label: 'Provincia' },
  { key: 'sucursal', label: 'Sucursal' },
  { key: 'estado', label: 'Estado' },
];

export default function ClientesCatalogo() {
  const router = useRouter();
  const {
    items: clientes,
    loading,
    page,
    totalPages,
    setPage,
    search,
    onSearchChange,
    sort,
    onSortChange,
    filters,
    onFilterChange,
    filterOptions,
    filtersLoading,
  } = useCatalogoPaginado(clienteClient, SELECT_FILTER_FIELDS);

  const text = (value?: string) => value || '—';

  const columns: TableColumn<Cliente>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (cliente) => (
        <div className={styles.nombreCell}>
          <span className={styles.nombrePrincipal} title={cliente.nombre}>
            {cliente.nombre}
          </span>
          {cliente.razonSocial && (
            <span className={styles.nombreSecundario} title={cliente.razonSocial}>
              {cliente.razonSocial}
            </span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'tipoCliente',
      header: 'Tipo',
      render: (cliente) => tipoClienteLabel(cliente.tipoCliente),
      sortable: true,
    },
    {
      key: 'nroDocumento',
      header: 'Documento',
      render: (cliente) =>
        cliente.nroDocumento
          ? `${cliente.tipoDocumento ? `${cliente.tipoDocumento} ` : ''}${cliente.nroDocumento}`
          : '—',
      sortable: true,
    },
    {
      key: 'condicionIva',
      header: 'Condición IVA',
      render: (cliente) => text(cliente.condicionIva),
      sortable: true,
    },
    { key: 'telefono', header: 'Teléfono', render: (cliente) => text(cliente.telefono), sortable: true },
    {
      key: 'sucursales',
      header: 'Sucursales',
      render: (cliente) => (
        <span className={styles.sucursalesCell} title={cliente.sucursales.map((s) => s.nombre).join(', ')}>
          {cliente.sucursales.length > 0 ? cliente.sucursales.map((s) => s.nombre).join(', ') : '—'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'provincia',
      header: 'Ubicación',
      render: (cliente) =>
        [cliente.localidad, cliente.provincia].filter(Boolean).join(', ') || '—',
      sortable: true,
    },
    {
      key: 'descuentoPorcentaje',
      header: 'Descuento',
      render: (cliente) => (cliente.descuentoPorcentaje != null ? formatPorcentaje(cliente.descuentoPorcentaje) : '—'),
      sortable: true,
      align: 'right',
      width: '1%',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (cliente) => (
        <Badge variant={cliente.activo ? 'success' : 'neutral'}>
          {cliente.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'acciones',
      header: '',
      render: (cliente) => (
        <div className={styles.rowActions}>
          <IconButton
            icon={<Eye size={16} />}
            label="Ver detalle"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/clientes/${cliente.id}`);
            }}
          />
          <IconButton
            icon={<Pencil size={16} />}
            label="Editar"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/clientes/${cliente.id}/editar`);
            }}
          />
        </div>
      ),
      align: 'right',
      width: '1%',
    },
  ];

  return (
    <Card
      title="Catálogo de clientes"
      actions={
        <Button variant="primary" onClick={() => router.push('/clientes/nuevo')}>
          + Nuevo cliente
        </Button>
      }
    >
      <div className={styles.toolbar}>
        <FilterBar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar por nombre, razón social, documento, email..."
          fields={FILTER_FIELDS}
          filters={filters}
          onFilterChange={onFilterChange}
          filterOptions={filterOptions}
          loading={filtersLoading}
        />
      </div>

      <Table
        columns={columns}
        data={clientes}
        getRowKey={(cliente) => cliente.id}
        emptyMessage={loading ? 'Cargando clientes...' : 'No se encontraron clientes.'}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={(cliente) => router.push(`/clientes/${cliente.id}`)}
        stickyHeader
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
    </Card>
  );
}
