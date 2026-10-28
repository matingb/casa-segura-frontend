'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Eye, Plus, Phone, Mail } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import ActionMenu from '../../../../../components/ui/ActionMenu/ActionMenu';
import CeldaTexto from '../../../../../components/ui/Table/CeldaTexto';
import TextoRecortado from '../../../../../components/ui/TextoRecortado/TextoRecortado';
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

  // Cliente | Datos fiscales | Contacto | Sucursales | Estado | Acciones, con el
  // mismo criterio que Productos: agrupar datos en pocas columnas.
  const columns: TableColumn<Cliente>[] = [
    {
      key: 'nombre',
      header: 'Cliente',
      render: (cliente) => {
        const ubicacion = [cliente.localidad, cliente.provincia].filter(Boolean).join(', ');
        const descuento = cliente.descuentoPorcentaje ? (
          <span className={styles.descuento}>Descuento: {formatPorcentaje(cliente.descuentoPorcentaje)}</span>
        ) : null;
        return (
          <div className={styles.cliente}>
            <CeldaTexto
              principal={cliente.nombre}
              secundarias={[cliente.razonSocial, ubicacion, descuento]}
              lineasPrincipal={2}
              lineasSecundarias={1}
            />
          </div>
        );
      },
      sortable: true,
    },
    {
      // Ordena por tipo, el dato principal de la celda.
      key: 'tipoCliente',
      header: 'Datos fiscales',
      render: (cliente) => {
        const tipo = cliente.tipoCliente ? tipoClienteLabel(cliente.tipoCliente) : '';
        const documento = cliente.nroDocumento
          ? `${cliente.tipoDocumento ? `${cliente.tipoDocumento} ` : ''}${cliente.nroDocumento}`
          : '';
        const detalle = [documento, cliente.condicionIva].filter(Boolean).join(' · ');
        if (!tipo && !detalle) return '—';
        return tipo ? (
          <CeldaTexto principal={tipo} secundarias={[detalle]} lineasSecundarias={2} />
        ) : (
          <CeldaTexto principal={detalle} lineasPrincipal={2} />
        );
      },
      sortable: true,
    },
    {
      // Ordena por teléfono, como la columna anterior.
      key: 'telefono',
      header: 'Contacto',
      render: (cliente) => {
        if (!cliente.telefono && !cliente.email) return '—';
        return (
          <div className={styles.contacto}>
            {cliente.telefono && (
              <span className={styles.contactoLinea}>
                <Phone size={14} aria-hidden="true" className={styles.contactoIcono} />
                <TextoRecortado>{cliente.telefono}</TextoRecortado>
              </span>
            )}
            {cliente.email && (
              <span className={styles.contactoLinea}>
                <Mail size={14} aria-hidden="true" className={styles.contactoIcono} />
                <TextoRecortado>{cliente.email}</TextoRecortado>
              </span>
            )}
          </div>
        );
      },
      sortable: true,
    },
    {
      key: 'sucursales',
      header: 'Sucursales',
      render: (cliente) => {
        if (cliente.sucursales.length === 0) return '—';
        const todas = cliente.sucursales.map((s) => s.nombre).join(', ');
        const visibles = cliente.sucursales.slice(0, 2).map((s) => s.nombre).join(', ');
        const resto = cliente.sucursales.length - 2;
        // Las dos primeras en una línea y un "+N" con el resto; el tooltip muestra todas.
        return (
          <span className={styles.sucursales} title={todas}>
            <TextoRecortado title={todas} className={styles.nombresSucursales}>{visibles}</TextoRecortado>
            {resto > 0 && <Badge variant="neutral">+{resto}</Badge>}
          </span>
        );
      },
      sortable: true,
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
      width: '1%',
    },
    {
      key: 'acciones',
      header: '',
      render: (cliente) => (
        <ActionMenu
          label={`Acciones de ${cliente.nombre}`}
          items={[
            { label: 'Ver detalle', icon: <Eye size={16} />, onSelect: () => router.push(`/clientes/${cliente.id}`) },
            { label: 'Editar', icon: <Pencil size={16} />, onSelect: () => router.push(`/clientes/${cliente.id}/editar`) },
          ]}
        />
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
          <Plus size={16} aria-hidden="true" /> Nuevo cliente
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
        ajustarAncho
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
    </Card>
  );
}
