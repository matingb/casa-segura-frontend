'use client';
import { useEffect, useRef, useState } from 'react';
import { FileDown, FileSpreadsheet, X } from 'lucide-react';
import { ListaPreciosCliente } from '../../../../../lib/types/ListaPreciosCliente';
import { ListaClienteNoDisponible } from '../ListaPreciosCliente/useListaPreciosCliente';
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
  clienteActivo: boolean;
  sucursales: Array<{ id: string; nombre: string }>;
  onRecursoNoDisponible?: (detalle: ListaClienteNoDisponible) => void | Promise<void>;
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
  clienteActivo,
  sucursales,
  onRecursoNoDisponible,
  onAsignarRegion,
}: Props) {
  const { showError, showSuccess } = useToast();
  const { comprobar, ocupado, dialogo } = useExportacionCotizacion();
  const lista = useListaPreciosCliente({ clienteId, sucursales, clienteActivo, activo: isOpen, onRecursoNoDisponible });
  const { datos, itemsFiltrados, cargando, hayCotizacion, filtroActivo, revalidarAcceso } = lista;
  const [formatoExportacion, setFormatoExportacion] = useState<'pdf' | 'excel' | null>(null);
  const exportacionAbierta = useRef<{
    formato: 'pdf' | 'excel';
    datos: ListaPreciosCliente;
    sucursalId: string;
    filtrar: typeof lista.filtrar;
    filas: ReturnType<typeof aFilaExportCliente>[];
    filtroActivo: boolean;
  } | null>(null);
  useEffect(() => {
    if (isOpen && !clienteActivo) {
      exportacionAbierta.current = null;
      onClose();
    }
  }, [isOpen, clienteActivo, onClose]);
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
  const exportar = (formato: 'pdf' | 'excel', data: ListaPreciosCliente, columnas: string[], filas: ReturnType<typeof aFilaExportCliente>[]) => {
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
    const captura = exportacionAbierta.current;
    setFormatoExportacion(null);
    exportacionAbierta.current = null;
    if (!captura) return;
    if (!clienteActivo || lista.sucursalId !== captura.sucursalId || !lista.esSnapshotVigente(captura.datos)) {
      showError('La selección o disponibilidad cambió. Volvé a cargar la lista antes de exportar.');
      return;
    }
    void comprobar({
      contexto: captura.datos.contexto_monetario,
      conservar: async () => {
        if (!clienteActivo || lista.sucursalId !== captura.sucursalId || !lista.esSnapshotVigente(captura.datos)) {
          throw new Error('La lista cambió o dejó de estar disponible antes de exportar.');
        }
        await revalidarAcceso();
        if (!clienteActivo || lista.sucursalId !== captura.sucursalId || !lista.esSnapshotVigente(captura.datos)) {
          throw new Error('La lista cambió o dejó de estar disponible durante la comprobación.');
        }
        exportar(captura.formato, captura.datos, columnas, captura.filas);
      },
      actualizar: async () => {
        if (!clienteActivo || lista.sucursalId !== captura.sucursalId) throw new Error('La selección cambió antes de actualizar la lista.');
        const nuevos = await lista.recargar();
        if (!clienteActivo || !lista.esSnapshotVigente(nuevos) || nuevos.sucursal.id !== captura.sucursalId) {
          throw new Error('La lista cambió o dejó de estar disponible durante la actualización.');
        }
        exportar(captura.formato, nuevos, columnas, captura.filtrar(nuevos.items).map(aFilaExportCliente));
      },
    });
  };
  const resumenExportacion = (cantidadColumnas: number) => {
    const captura = exportacionAbierta.current;
    const cantidad = captura?.filas.length ?? 0;
    const productos = cantidad === 1 ? '1 producto' : `${cantidad} productos`;
    const columnas = cantidadColumnas === 1 ? '1 columna' : `${cantidadColumnas} columnas`;
    return `Se van a exportar ${productos}${captura?.filtroActivo ? ' (filtro activo)' : ''} con ${columnas}.`;
  };
  const exportarDeshabilitado = !clienteActivo || cargando || ocupado || !lista.disponible || !lista.esSnapshotVigente(datos) || itemsFiltrados.length === 0;

  const abrirExportacion = (formato: 'pdf' | 'excel') => {
    if (!clienteActivo || !datos || !lista.esSnapshotVigente(datos) || exportarDeshabilitado) {
      showError('Esperá a que la lista esté completa y disponible antes de exportar.');
      return;
    }
    const filas = lista.filtrar(datos.items).map(aFilaExportCliente);
    if (!filas.length) {
      showError('No hay productos para exportar con el filtro actual.');
      return;
    }
    exportacionAbierta.current = { formato, datos, sucursalId: lista.sucursalId, filtrar: lista.filtrar, filas, filtroActivo };
    setFormatoExportacion(formato);
  };

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
            {!clienteActivo ? (
              <p role="status">El cliente está inactivo. Reactivalo para consultar o exportar su lista de precios.</p>
            ) : (
              <TablaPreciosCliente lista={lista} sucursales={sucursales} onAsignarRegion={onAsignarRegion} className={styles.vista} />
            )}
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
                onClick={() => abrirExportacion('excel')}
                disabled={exportarDeshabilitado}
              >
                <FileSpreadsheet size={15} />
                Exportar Excel
              </button>
              <button
                type="button"
                className={styles.btnPdf}
                onClick={() => abrirExportacion('pdf')}
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
          onClose={() => { setFormatoExportacion(null); exportacionAbierta.current = null; }}
          onConfirm={confirmarExportacion}
        />
      )}
    </>
  );
}
