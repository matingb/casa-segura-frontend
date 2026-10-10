'use client';
import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, X } from 'lucide-react';
import { ListaPreciosCliente } from '../../../../../lib/types/ListaPreciosCliente';
import { useToast } from '../../../../../context/ToastContext';
import ExportarColumnasModal from '../../../../../components/ExportarColumnasModal/ExportarColumnasModal';
import { useExportacionCotizacion } from '../../../../../lib/hooks/useExportacionCotizacion';
import { useListaPreciosCliente } from '../ListaPreciosCliente/useListaPreciosCliente';
import TablaPreciosCliente from '../ListaPreciosCliente/TablaPreciosCliente';
import { exportarListaPreciosClientePdf, DatosClienteExport } from './exportPdfCliente';
import { exportarListaPreciosClienteExcel } from './exportExcelCliente';
import { aFilaExportCliente, columnasElegiblesCliente } from './columnasExportCliente';
import styles from './ClienteListaPreciosModal.module.css';
export type { ItemConMargenCalculado } from './validarMargenListaPrecios';
interface Props {
  isOpen: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNombre: string;
  clienteRazonSocial?: string | null;
  clienteNroDocumento?: string | null;
  descuentoHabitual?: number | null;
  sucursales: Array<{ id: string; nombre: string }>;
  /** Cierra el modal y lleva a la asignación de región del cliente. */
  onAsignarRegion?: () => void;
}
export default function ClienteListaPreciosModal({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  clienteRazonSocial,
  clienteNroDocumento,
  sucursales,
  onAsignarRegion,
}: Props) {
  const { showError, showSuccess } = useToast();
  const { comprobar, ocupado, dialogo } = useExportacionCotizacion();
  const lista = useListaPreciosCliente({ clienteId, sucursales, activo: isOpen });
  const { datos, itemsFiltrados, cargando, hayCotizacion, filtroActivo } = lista;
  const [formatoExportacion, setFormatoExportacion] = useState<'pdf' | 'excel' | null>(null);
  useEffect(() => {
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Con un diálogo encima, Escape cierra solo ese diálogo.
    if (isOpen && !formatoExportacion) document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [isOpen, onClose, formatoExportacion]);
  const datosCliente = (data: ListaPreciosCliente): DatosClienteExport => ({
    nombre: data.cliente.nombre ?? clienteNombre,
    razonSocial: clienteRazonSocial,
    nroDocumento: clienteNroDocumento,
  });
  const exportar = (formato: 'pdf' | 'excel', data: ListaPreciosCliente, columnas: string[]) => {
    // Mismos filtros que la tabla en pantalla; al archivo solo pasan las columnas de la lista blanca.
    const filas = lista.filtrar(data.items).map(aFilaExportCliente);
    if (!filas.length) throw new Error('No hay productos para exportar con el filtro actual.');
    const params = {
      filas,
      columnas,
      cliente: datosCliente(data),
      sucursalNombre: data.sucursal.nombre,
      contexto: data.contexto_monetario,
    };
    if (formato === 'pdf') exportarListaPreciosClientePdf(params);
    else exportarListaPreciosClienteExcel(params);
    showSuccess('Lista exportada');
  };
  const confirmarExportacion = (columnas: string[]) => {
    const formato = formatoExportacion;
    setFormatoExportacion(null);
    if (!formato) return;
    if (!datos) {
      showError('Esperá a que cargue la lista antes de exportar.');
      return;
    }
    void comprobar({
      contexto: datos.contexto_monetario,
      conservar: () => exportar(formato, datos, columnas),
      actualizar: async () => exportar(formato, await lista.recargar(), columnas),
    });
  };
  const resumenExportacion = (cantidadColumnas: number) => {
    const productos = itemsFiltrados.length === 1 ? '1 producto' : `${itemsFiltrados.length} productos`;
    const columnas = cantidadColumnas === 1 ? '1 columna' : `${cantidadColumnas} columnas`;
    return `Se van a exportar ${productos}${filtroActivo ? ' (filtro activo)' : ''} con ${columnas}.`;
  };
  const exportarDeshabilitado = cargando || ocupado || itemsFiltrados.length === 0;

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onMouseDown={onClose}>
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lista-cliente-titulo"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div className={styles.titleArea}>
              <h2 id="lista-cliente-titulo" className={styles.title}>
                Lista de precios de {clienteNombre}
              </h2>
              <p className={styles.subtitle}>
                {clienteRazonSocial ? `${clienteRazonSocial} · ` : ''}Precios finales con todos los descuentos del cliente aplicados.
              </p>
            </div>
            <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          <div className={styles.body}>
            {dialogo}
            <TablaPreciosCliente lista={lista} sucursales={sucursales} onAsignarRegion={onAsignarRegion} className={styles.vista} />
          </div>

          <div className={styles.footer}>
            <div className={styles.footerInfo}>
              Los precios finales incluyen todos los niveles de descuento configurados para este cliente.
            </div>
            <div className={styles.actionsGroup}>
              <button type="button" className={styles.btnClose} onClick={onClose}>
                Cerrar
              </button>
              <button
                type="button"
                className={styles.btnExcel}
                onClick={() => setFormatoExportacion('excel')}
                disabled={exportarDeshabilitado}
              >
                <FileSpreadsheet size={15} />
                Exportar Excel
              </button>
              <button
                type="button"
                className={styles.btnPdf}
                onClick={() => setFormatoExportacion('pdf')}
                disabled={exportarDeshabilitado}
              >
                <FileDown size={15} />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      {formatoExportacion && (
        <ExportarColumnasModal
          title={`Exportar lista de precios de ${clienteNombre}${clienteRazonSocial ? ` (${clienteRazonSocial})` : ''}`}
          columnas={columnasElegiblesCliente(hayCotizacion)}
          seleccionInicial={[]}
          resumen={resumenExportacion}
          confirmLabel={formatoExportacion === 'pdf' ? 'Exportar PDF' : 'Exportar Excel'}
          onClose={() => setFormatoExportacion(null)}
          onConfirm={confirmarExportacion}
        />
      )}
    </>
  );
}
