'use client';

import { useRef, useCallback } from 'react';
import { FileDown } from 'lucide-react';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Badge from '../../../../../components/ui/Badge/Badge';
import Table, { TableColumn } from '../../../../../components/ui/Table/Table';
import Dropdown from '../../../../../components/ui/Dropdown/Dropdown';
import { StockItem } from '../../../../../lib/types/Stock';
import { useListaPrecios } from '../../_hooks/useListaPrecios';
import styles from './ListaPreciosCatalogo.module.css';

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export default function ListaPreciosCatalogo() {
  const {
    sucursalId,
    setSucursalId,
    sucursalOptions,
    items,
    isLoading,
    sucursalNombre,
  } = useListaPrecios();

  const printAreaRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = useCallback(() => {
    if (!sucursalId) return;

    // Construir tabla de impresión dinámica
    const fecha = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const filas = items
      .map(
        (item) => `
        <tr>
          <td>${item.codigo}</td>
          <td>${item.nombre}</td>
          <td>${item.marca}</td>
          <td>${item.modelo}</td>
          <td style="text-align:right">${formatARS(item.precioVentaArs)}</td>
          <td style="text-align:right">${formatUSD(item.precioVentaUsd)}</td>
          <td style="text-align:center">${item.iva}%</td>
        </tr>`
      )
      .join('');

    const printContent = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Lista de precios – ${sucursalNombre}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; color: #111; }
            h2 { margin: 0 0 4px; font-size: 18px; }
            p.meta { margin: 0 0 16px; font-size: 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #1a1a2e; color: #fff; padding: 7px 10px; text-align: left; }
            td { border-bottom: 1px solid #e5e7eb; padding: 6px 10px; }
            tr:nth-child(even) td { background: #f9fafb; }
            .right { text-align: right; }
            .center { text-align: center; }
            @page { margin: 16mm; }
          </style>
        </head>
        <body>
          <h2>Lista de Precios – ${sucursalNombre}</h2>
          <p class="meta">Fecha de emisión: ${fecha} &nbsp;|&nbsp; Productos habilitados: ${items.length}</p>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th class="right">Precio ARS</th>
                <th class="right">Precio USD</th>
                <th class="center">IVA</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </body>
      </html>`;

    const win = window.open('', '_blank', 'width=900,height=650');
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.focus();
    // Pequeño delay para que el browser renderice antes de imprimir
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  }, [items, sucursalId, sucursalNombre]);

  const columns: TableColumn<StockItem>[] = [
    {
      key: 'imagen',
      header: 'Img.',
      render: (item) =>
        item.imagenUrl ? (
          <img
            src={item.imagenUrl}
            alt={item.nombre}
            className={styles.thumbnail}
          />
        ) : (
          <div className={styles.thumbnailPlaceholder}>Sin imagen</div>
        ),
    },
    { key: 'codigo', header: 'Código', render: (item) => item.codigo },
    { key: 'nombre', header: 'Nombre', render: (item) => item.nombre },
    { key: 'marca', header: 'Marca', render: (item) => item.marca },
    { key: 'modelo', header: 'Modelo', render: (item) => item.modelo },
    {
      key: 'precioArs',
      header: 'Precio ARS',
      render: (item) => (
        <span className={styles.priceArs}>{formatARS(item.precioVentaArs)}</span>
      ),
    },
    {
      key: 'precioUsd',
      header: 'Precio USD',
      render: (item) => (
        <span className={styles.priceUsd}>{formatUSD(item.precioVentaUsd)}</span>
      ),
    },
    {
      key: 'iva',
      header: 'IVA',
      render: (item) => (
        <span className={styles.ivaTag}>{item.iva}%</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: () => <Badge variant="success">Habilitado</Badge>,
    },
  ];

  const canExport = sucursalId && items.length > 0;

  return (
    <Card
      title="Lista de Precios"
      actions={
        <div className={styles.actionsRow}>
          <div className={styles.dropdownWrapper}>
            <Dropdown
              id="selector-sucursal"
              label="Sucursal"
              options={sucursalOptions}
              value={sucursalId}
              onChange={setSucursalId}
            />
          </div>
          <Button
            variant="primary"
            className={styles.exportBtn}
            onClick={handleExportPDF}
            disabled={!canExport}
            title={!sucursalId ? 'Seleccioná una sucursal primero' : !items.length ? 'No hay productos habilitados' : 'Exportar lista a PDF'}
          >
            <FileDown size={16} />
            Exportar PDF
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <p className={styles.loadingText}>Cargando lista de precios…</p>
      ) : !sucursalId ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>Seleccioná una sucursal</p>
          <p className={styles.emptyStateHint}>
            Elegí una sucursal para ver sus productos habilitados con precios.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateTitle}>Sin productos habilitados</p>
          <p className={styles.emptyStateHint}>
            La sucursal <strong>{sucursalNombre}</strong> no tiene productos habilitados en stock.
          </p>
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={items}
            getRowKey={(item) => item.id}
            emptyMessage="No se encontraron productos."
          />
          {/* Área oculta de referencia, no se usa en esta implementación */}
          <div ref={printAreaRef} />
        </>
      )}
    </Card>
  );
}
