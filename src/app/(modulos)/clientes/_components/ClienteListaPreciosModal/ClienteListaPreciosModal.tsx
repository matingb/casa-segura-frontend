'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, FileSpreadsheet, Search, X } from 'lucide-react';
import { descuentoEngineClient } from '../../../../../lib/api/descuento-engine.client';
import { ListaPreciosCliente } from '../../../../../lib/types/ListaPreciosCliente';
import { formatARS, formatUSD, formatPorcentaje } from '../../../../../lib/utils/formatters';
import { useToast } from '../../../../../context/ToastContext';
import { useCotizacion } from '../../../../../context/CotizacionContext';
import ContextoPrecios from '../../../../../components/ContextoPrecios';
import { useExportacionCotizacion } from '../../../../../lib/hooks/useExportacionCotizacion';
import { exportarListaPreciosClientePdf, DatosClienteExport } from './exportPdfCliente';
import { exportarListaPreciosClienteExcel } from './exportExcelCliente';
import { validarMargenListaPrecios } from './validarMargenListaPrecios';
import styles from './ClienteListaPreciosModal.module.css';
export type { ItemConMargenCalculado } from './validarMargenListaPrecios';
interface Props {
  isOpen: boolean; onClose: () => void; clienteId: string; clienteNombre: string;
  clienteRazonSocial?: string | null; clienteNroDocumento?: string | null;
  descuentoHabitual?: number | null; sucursales: Array<{ id: string; nombre: string }>;
}
export default function ClienteListaPreciosModal({ isOpen, onClose, clienteId, clienteNombre, clienteRazonSocial, clienteNroDocumento, sucursales }: Props) {
  const { showError, showSuccess } = useToast();
  const { revision, datos: cotizacion } = useCotizacion();
  const { comprobar, ocupado, dialogo } = useExportacionCotizacion();
  const [sucursalElegida, setSelectedSucursalId] = useState('');
  const selectedSucursalId = sucursalElegida || sucursales[0]?.id || '';
  const [datos, setDatos] = useState<ListaPreciosCliente | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const request = useRef(0);
  const recargar = useCallback(async () => {
    const id = ++request.current; setLoadingData(true);
    setDatos(prev => prev?.sucursal.id === selectedSucursalId && prev.cliente.id === clienteId ? prev : null);
    try {
      const data = await descuentoEngineClient.listaCliente(selectedSucursalId, clienteId);
      if (id === request.current) { setDatos(data); setError(null); }
      return data;
    } catch (err) {
      if (id === request.current) setError(err instanceof Error ? err.message : 'No se pudo actualizar la lista.');
      throw err;
    } finally { if (id === request.current) setLoadingData(false); }
  }, [selectedSucursalId, clienteId]);
  useEffect(() => {
    if (!isOpen || !clienteId || !selectedSucursalId) return;
    let activo = true;
    const contador = request;
    void Promise.resolve().then(() => activo ? recargar() : undefined).catch(() => {});
    return () => { activo = false; contador.current++; };
  }, [isOpen, clienteId, selectedSucursalId, revision, recargar]);
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [isOpen, onClose]);
  const sucursalActual = datos?.sucursal ?? sucursales.find(s => s.id === selectedSucursalId);
  const regionAsignada = datos?.cliente.regionNombre ? { regionNombre: datos.cliente.regionNombre, descuento: Number(datos.cliente.regionDescuento ?? 0) } : null;
  const habitual = datos?.cliente.descuento_porcentaje == null ? null : Number(datos.cliente.descuento_porcentaje);
  const itemsCalculados = useMemo(() => datos?.sucursal.id === selectedSucursalId && datos.cliente.id === clienteId ? datos.items : [], [datos, selectedSucursalId, clienteId]);
  const validacionMargen = useMemo(() => validarMargenListaPrecios(itemsCalculados), [itemsCalculados]);
  const filtrar = (items: ListaPreciosCliente['items']) => {
    const q = search.trim().toLowerCase();
    return items.filter(item => !q || [item.codigo, item.nombre, item.marca, item.modelo, item.subtipoNombre].some(valor => valor?.toLowerCase().includes(q)));
  };
  const itemsFiltrados = filtrar(itemsCalculados);
  const datosCliente = (data: ListaPreciosCliente): DatosClienteExport => ({
    nombre: data.cliente.nombre ?? clienteNombre, razonSocial: clienteRazonSocial, nroDocumento: clienteNroDocumento,
    descuentoHabitual: data.cliente.descuento_porcentaje == null ? null : Number(data.cliente.descuento_porcentaje),
    regionNombre: data.cliente.regionNombre, regionDescuento: data.cliente.regionDescuento == null ? null : Number(data.cliente.regionDescuento),
  });
  const exportar = (formato: 'pdf' | 'excel', data: ListaPreciosCliente) => {
    const validacion = validarMargenListaPrecios(data.items);
    if (!validacion.puedeGenerar) throw new Error(validacion.mensajeError);
    const items = filtrar(data.items);
    if (!items.length) throw new Error('No hay productos en la selección para exportar.');
    const params = { items, cliente: datosCliente(data), sucursalNombre: data.sucursal.nombre, contexto: data.contexto_monetario };
    if (formato === 'pdf') exportarListaPreciosClientePdf(params); else exportarListaPreciosClienteExcel(params);
    showSuccess('Lista generada y descargada correctamente.');
  };
  const prepararExportacion = (formato: 'pdf' | 'excel') => {
    if (!datos) { showError('Cargá la lista antes de exportar.'); return; }
    void comprobar({ contexto: datos.contexto_monetario, conservar: () => exportar(formato, datos), actualizar: async () => exportar(formato, await recargar()) });
  };
  const handleExportPdf = () => prepararExportacion('pdf');
  const handleExportExcel = () => prepararExportacion('excel');

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

          <ContextoPrecios contexto={datos?.contexto_monetario ?? cotizacion} error={error} legado={itemsCalculados.some(item => item.estadoPrecio === 'LEGADO_PENDIENTE_REVISION')} />
          {dialogo}
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
              {habitual != null && habitual > 0 ? (
                <span className={styles.badgeHighlight}>
                  -{formatPorcentaje(habitual)}
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
                    <th>Referencia</th>
                    <th style={{ textAlign: 'right' }}>Precio Lista ARS</th>
                    <th style={{ textAlign: 'center' }}>% Descuento</th>
                    <th style={{ textAlign: 'right' }}>Precio Cliente (ARS)</th>
                    <th style={{ textAlign: 'right' }}>Precio USD</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingData ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyState}>
                        Cargando y calculando lista de precios...
                      </td>
                    </tr>
                  ) : itemsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyState}>
                        {!selectedSucursalId ? 'Asigná una sucursal al cliente para consultar su lista de precios.' : search.trim()
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
                        <td>{item.monedaReferencia ?? 'ARS'}{item.estadoPrecio === 'LEGADO_PENDIENTE_REVISION' ? ' · revisar' : ''}</td>
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
              disabled={loadingData || ocupado || itemsFiltrados.length === 0 || !validacionMargen.puedeGenerar}
              title={!validacionMargen.puedeGenerar ? 'Generación bloqueada: hay productos que no alcanzan el margen mínimo' : undefined}
            >
              <FileSpreadsheet size={15} />
              Exportar Excel
            </button>

            <button
              type="button"
              className={`${styles.btnPdf} ${!validacionMargen.puedeGenerar ? styles.btnBlockedMargin : ''}`}
              onClick={handleExportPdf}
              disabled={loadingData || ocupado || itemsFiltrados.length === 0 || !validacionMargen.puedeGenerar}
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
