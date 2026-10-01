'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, Search, X } from 'lucide-react';
import { StockItem } from '../../../../../lib/types/Stock';
import { DescuentosClienteResumen } from '../../../../../lib/types/Region';
import { stockClient } from '../../../../../lib/api/stock.client';
import { clienteDescuentoClient } from '../../../../../lib/api/cliente-descuento.client';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { calcularCascada, redondear } from '../../../../../lib/utils/cascada-descuentos';
import { formatARS, formatUSD, formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import {
  exportarListaPreciosClientePdf,
  ItemListaCliente,
  DatosClienteExport,
} from './exportPdfCliente';
import { exportarListaPreciosClienteExcel } from './exportExcelCliente';
import {
  ItemConMargenCalculado,
  evaluarAlcanzaMargen,
  validarMargenListaPrecios,
} from './validarMargenListaPrecios';
import styles from './ClienteListaPreciosModal.module.css';

interface SucursalBasic {
  id: string;
  nombre: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  clienteRazonSocial?: string | null;
  clienteNroDocumento?: string | null;
  descuentoHabitual?: number | null;
  sucursales: SucursalBasic[];
}

export type { ItemConMargenCalculado };

export default function ClienteListaPreciosModal({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  clienteRazonSocial,
  clienteNroDocumento,
  descuentoHabitual,
  sucursales,
}: Props) {
  const { showError, showSuccess } = useToast();
  const { getSubtipoNombre, getTipoIdDeSubtipo } = useClasificacion();

  const [selectedSucursalId, setSelectedSucursalId] = useState<string>(
    sucursales[0]?.id ?? ''
  );
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const [resumen, setResumen] = useState<DescuentosClienteResumen | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [search, setSearch] = useState('');

  // Sincronizar sucursal inicial si cambia la lista
  useEffect(() => {
    if (sucursales.length > 0 && !selectedSucursalId) {
      setSelectedSucursalId(sucursales[0].id);
    }
  }, [sucursales, selectedSucursalId]);

  // Cargar stock y estructura de descuentos del cliente cuando abre el modal
  useEffect(() => {
    if (!isOpen || !clienteId) return;

    let cancel = false;
    async function cargar() {
      setLoadingData(true);
      try {
        const [stockData, descuentosData] = await Promise.all([
          stockClient.obtenerTodos(),
          clienteDescuentoClient.obtenerDescuentos(clienteId),
        ]);
        if (!cancel) {
          setStockTotal(stockData);
          setResumen(descuentosData);
        }
      } catch (err) {
        if (!cancel) {
          showError('Error al cargar datos para la lista de precios.');
        }
      } finally {
        if (!cancel) setLoadingData(false);
      }
    }

    cargar();
    return () => {
      cancel = true;
    };
  }, [isOpen, clienteId, showError]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sucursal seleccionada
  const sucursalActual = useMemo(
    () => sucursales.find((s) => s.id === selectedSucursalId) ?? sucursales[0],
    [sucursales, selectedSucursalId]
  );

  // Región de esta sucursal asignada al cliente
  const regionAsignada = useMemo(
    () => resumen?.regiones.find((r) => r.sucursalId === selectedSucursalId) ?? null,
    [resumen, selectedSucursalId]
  );

  // Calcular precios para cada artículo de stock disponible en esta sucursal
  const itemsCalculados: ItemConMargenCalculado[] = useMemo(() => {
    if (!selectedSucursalId || stockTotal.length === 0) return [];

    const itemsSucursal = stockTotal.filter(
      (item) => item.sucursalId === selectedSucursalId && item.activo
    );

    return itemsSucursal.map((item) => {
      const precioBase = Number(item.precioVentaArs) || 0;
      const subtipoNombre = getSubtipoNombre(item.subtipoId);
      const tipoId = getTipoIdDeSubtipo(item.subtipoId);

      // Descuento de categoría para este cliente
      const catCliente =
        resumen?.categorias.find((c) => c.subtipoId === item.subtipoId) ??
        resumen?.categorias.find((c) => c.tipoId === tipoId) ??
        null;

      // Descuento de producto para este cliente
      const prodCliente =
        resumen?.productos.find((p) => p.productoId === item.productoId) ?? null;

      // Cascada completa con análisis
      const resCascada = calcularCascada({
        precioBase,
        descuentoProducto: item.descuento,
        descuentoRegionCliente: regionAsignada?.descuento,
        descuentoCategoriaCliente: catCliente?.porcentaje,
        descuentoProductoCliente: prodCliente?.porcentaje,
        descuentoCliente: resumen?.descuentoGeneral ?? descuentoHabitual,
        costoReposicion: item.costoReposicion,
        margenMinimo: item.margenMinimo,
      });

      const descuentoTotal = resCascada.descuentoEfectivo;
      const precioFinalArs = resCascada.precioFinal;

      // Calcular precio USD si el producto tiene cotización base
      const precioUsd =
        item.precioVentaUsd && Number(item.precioVentaUsd) > 0
          ? redondear(Number(item.precioVentaUsd) * (1 - descuentoTotal / 100))
          : null;

      // Etiquetas descriptivas de los descuentos aplicados
      const descuentosDetalle: string[] = [];
      if (regionAsignada?.descuento) {
        descuentosDetalle.push(`Región: -${regionAsignada.descuento}%`);
      }
      if (catCliente?.porcentaje) {
        descuentosDetalle.push(`Cat: -${catCliente.porcentaje}%`);
      }
      if (prodCliente?.porcentaje) {
        descuentosDetalle.push(`Prod: -${prodCliente.porcentaje}%`);
      }
      if (descuentoHabitual && descuentoHabitual > 0) {
        descuentosDetalle.push(`Habitual: -${descuentoHabitual}%`);
      }

      const { noAlcanzaMargen, motivo: motivoMargen } = evaluarAlcanzaMargen({
        precioSinTope: resCascada.precioSinTope,
        costoReposicion: item.costoReposicion,
        margenMinimo: item.margenMinimo,
        precioMinimo: resCascada.precioMinimo,
      });

      return {
        id: item.id,
        productoId: item.productoId,
        codigo: item.codigo || '—',
        nombre: item.nombre,
        marca: item.marca,
        modelo: item.modelo,
        subtipoNombre,
        precioListaArs: precioBase,
        descuentoTotalPorcentaje: descuentoTotal,
        precioFinalArs,
        precioFinalUsd: precioUsd,
        iva: item.iva,
        descuentosDetalle,
        precioSinTope: resCascada.precioSinTope,
        precioMinimo: resCascada.precioMinimo,
        costoReposicion: item.costoReposicion,
        margenMinimo: item.margenMinimo,
        noAlcanzaMargen,
        motivoMargen,
      };
    });
  }, [
    stockTotal,
    selectedSucursalId,
    resumen,
    regionAsignada,
    descuentoHabitual,
    getSubtipoNombre,
    getTipoIdDeSubtipo,
  ]);

  // Validación de margen de utilidad para toda la lista de precios
  const validacionMargen = useMemo(
    () => validarMargenListaPrecios(itemsCalculados),
    [itemsCalculados]
  );

  // Filtrado por buscador
  const itemsFiltrados = useMemo(() => {
    if (!search.trim()) return itemsCalculados;
    const q = search.trim().toLowerCase();
    return itemsCalculados.filter(
      (item) =>
        item.codigo.toLowerCase().includes(q) ||
        item.nombre.toLowerCase().includes(q) ||
        (item.marca && item.marca.toLowerCase().includes(q)) ||
        (item.modelo && item.modelo.toLowerCase().includes(q)) ||
        item.subtipoNombre.toLowerCase().includes(q)
    );
  }, [itemsCalculados, search]);

  const datosClienteExport: DatosClienteExport = {
    nombre: clienteNombre,
    razonSocial: clienteRazonSocial,
    nroDocumento: clienteNroDocumento,
    descuentoHabitual,
    regionNombre: regionAsignada?.regionNombre,
    regionDescuento: regionAsignada?.descuento,
  };

  const handleExportPdf = () => {
    if (itemsFiltrados.length === 0) {
      showError('No hay productos en la lista para exportar.');
      return;
    }
    if (!validacionMargen.puedeGenerar) {
      showError(
        validacionMargen.mensajeError ||
          'No se puede generar la lista de precios: hay productos con margen insuficiente.'
      );
      return;
    }
    try {
      exportarListaPreciosClientePdf({
        items: itemsFiltrados,
        cliente: datosClienteExport,
        sucursalNombre: sucursalActual?.nombre ?? 'Sucursal',
      });
      showSuccess('PDF generado y descargado correctamente.');
    } catch (err) {
      showError('Error al generar PDF de lista de precios.');
    }
  };

  const handleExportExcel = () => {
    if (itemsFiltrados.length === 0) {
      showError('No hay productos en la lista para exportar.');
      return;
    }
    if (!validacionMargen.puedeGenerar) {
      showError(
        validacionMargen.mensajeError ||
          'No se puede generar la lista de precios: hay productos con margen insuficiente.'
      );
      return;
    }
    try {
      exportarListaPreciosClienteExcel({
        items: itemsFiltrados,
        cliente: datosClienteExport,
        sucursalNombre: sucursalActual?.nombre ?? 'Sucursal',
      });
      showSuccess('Excel generado y descargado correctamente.');
    } catch (err) {
      showError('Error al generar Excel de lista de precios.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        {/* Cabecera del modal */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>Lista de Precios del Cliente</h2>
            <p className={styles.subtitle}>
              Precios personalizados para {clienteNombre}{' '}
              {clienteRazonSocial ? `(${clienteRazonSocial})` : ''} calculados con descuentos en cadena.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido / Cuerpo */}
        <div className={styles.body}>
          {/* Barra de control: selector de sucursal y buscador */}
          <div className={styles.controlsBar}>
            {sucursales.length > 1 ? (
              <div className={styles.sucursalSelector}>
                <label htmlFor="modal-sucursal-select">Punto de venta:</label>
                <select
                  id="modal-sucursal-select"
                  className={styles.select}
                  value={selectedSucursalId}
                  onChange={(e) => setSelectedSucursalId(e.target.value)}
                  disabled={loadingData}
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className={styles.sucursalSelector}>
                <span>Punto de venta:</span>
                <span className={styles.badgeHighlight}>{sucursalActual?.nombre ?? 'General'}</span>
              </div>
            )}

            <div className={styles.searchWrapper}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar por código, producto o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Alerta de bloqueo si algún producto no alcanza el margen mínimo */}
          {!validacionMargen.puedeGenerar && (
            <div className={styles.alertBanner} role="alert">
              <div className={styles.alertIcon}>⚠️</div>
              <div className={styles.alertContent}>
                <strong>Generación de lista bloqueada por margen de utilidad</strong>
                <p>
                  Hay {validacionMargen.productosBajoMargen.length} producto(s) cuyos descuentos configurados no permiten alcanzar el margen mínimo de ganancia.
                  No se puede generar ni exportar la lista de precios hasta ajustar los descuentos del cliente para cumplir con el margen.
                </p>
              </div>
            </div>
          )}

          {/* Fila informativa de descuentos activos para esta sucursal */}
          <div className={styles.badgesRow}>
            <div className={styles.badgeItem}>
              <span>Región:</span>
              {regionAsignada ? (
                <span className={styles.badgeHighlight}>
                  {regionAsignada.regionNombre} (-{formatPorcentaje(regionAsignada.descuento)})
                </span>
              ) : (
                <span className={styles.badgeValue}>Sin región asignada</span>
              )}
            </div>

            <div className={styles.badgeItem}>
              <span>Desc. habitual:</span>
              {descuentoHabitual != null && descuentoHabitual > 0 ? (
                <span className={styles.badgeHighlight}>
                  -{formatPorcentaje(descuentoHabitual)}
                </span>
              ) : (
                <span className={styles.badgeValue}>0%</span>
              )}
            </div>

            <div className={styles.badgeItem} style={{ marginLeft: 'auto' }}>
              <span>Total en lista:</span>
              <strong className={styles.badgeValue}>{itemsFiltrados.length} artículos</strong>
            </div>
          </div>

          {/* Tabla interactiva de precios */}
          <div className={styles.tableContainer}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '110px' }}>Código</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'right' }}>Precio Lista</th>
                    <th style={{ textAlign: 'center' }}>% Descuento</th>
                    <th style={{ textAlign: 'right' }}>Precio Cliente (ARS)</th>
                    <th style={{ textAlign: 'right' }}>Precio USD</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyState}>
                        Cargando y calculando lista de precios...
                      </td>
                    </tr>
                  ) : itemsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyState}>
                        {search.trim()
                          ? 'No se encontraron productos que coincidan con la búsqueda.'
                          : 'No hay productos disponibles en esta sucursal.'}
                      </td>
                    </tr>
                  ) : (
                    itemsFiltrados.map((item) => (
                      <tr key={item.id} className={item.noAlcanzaMargen ? styles.rowError : undefined}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {item.codigo}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.nombre}</div>
                          {(item.marca || item.modelo) && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                              {[item.marca, item.modelo].filter(Boolean).join(' • ')}
                            </div>
                          )}
                          {item.noAlcanzaMargen && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <span className={styles.badgeDanger} title={item.motivoMargen}>
                                Margen insuficiente (piso: {formatARS(item.precioMinimo ?? 0)})
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--color-text-muted)' }}>
                          {item.subtipoNombre}
                        </td>
                        <td className={`${styles.tdNum} ${item.descuentoTotalPorcentaje > 0 ? styles.priceBase : ''}`}>
                          {formatARS(item.precioListaArs)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {item.descuentoTotalPorcentaje > 0 ? (
                            <span
                              className={styles.discountTag}
                              title={item.descuentosDetalle.join(' + ')}
                            >
                              -{formatPorcentaje(item.descuentoTotalPorcentaje)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td className={`${styles.tdNum} ${styles.priceFinal}`}>
                          {formatARS(item.precioFinalArs)}
                        </td>
                        <td className={styles.tdNum} style={{ color: 'var(--color-text-muted)' }}>
                          {item.precioFinalUsd != null ? formatUSD(item.precioFinalUsd) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pie con acciones de exportación */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            Los precios finales incluyen todos los niveles de descuento configurados para este cliente.
          </div>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={styles.btnClose}
              onClick={onClose}
            >
              Cerrar
            </button>

            <button
              type="button"
              className={`${styles.btnExcel} ${!validacionMargen.puedeGenerar ? styles.btnBlockedMargin : ''}`}
              onClick={handleExportExcel}
              disabled={loadingData || itemsFiltrados.length === 0 || !validacionMargen.puedeGenerar}
              title={!validacionMargen.puedeGenerar ? 'Generación bloqueada: hay productos que no alcanzan el margen mínimo' : undefined}
            >
              <FileSpreadsheet size={15} />
              Exportar Excel
            </button>

            <button
              type="button"
              className={`${styles.btnPdf} ${!validacionMargen.puedeGenerar ? styles.btnBlockedMargin : ''}`}
              onClick={handleExportPdf}
              disabled={loadingData || itemsFiltrados.length === 0 || !validacionMargen.puedeGenerar}
              title={!validacionMargen.puedeGenerar ? 'Generación bloqueada: hay productos que no alcanzan el margen mínimo' : undefined}
            >
              <FileDown size={15} />
              Exportar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
