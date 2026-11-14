import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClienteListaPreciosModal from './ClienteListaPreciosModal';
import { ListaPreciosCliente } from '../../../../../lib/types/ListaPreciosCliente';

const mocks = vi.hoisted(() => ({
  comprobar: vi.fn(),
  revalidarAcceso: vi.fn(),
  exportExcel: vi.fn(),
  exportPdf: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  snapshotVigente: true,
  useLista: vi.fn(),
}));

vi.mock('../../../../../context/ToastContext', () => ({
  useToast: () => ({ showError: mocks.showError, showSuccess: mocks.showSuccess }),
}));
vi.mock('../../../../../lib/hooks/useExportacionCotizacion', () => ({
  useExportacionCotizacion: () => ({ comprobar: mocks.comprobar, ocupado: false, dialogo: null }),
}));
vi.mock('../ListaPreciosCliente/useListaPreciosCliente', () => ({
  useListaPreciosCliente: mocks.useLista,
}));
vi.mock('../ListaPreciosCliente/TablaPreciosCliente', () => ({ default: () => null }));
vi.mock('../../../../../components/ExportarColumnasModal/ExportarColumnasModal', () => ({
  default: ({ onConfirm }: { onConfirm: (keys: string[]) => void }) => (
    <button type="button" onClick={() => onConfirm(['nombre', 'precioClienteArs'])}>Confirmar columnas</button>
  ),
}));
vi.mock('./exportPdfCliente', () => ({ exportarListaPreciosClientePdf: mocks.exportPdf }));
vi.mock('./exportExcelCliente', () => ({ exportarListaPreciosClienteExcel: mocks.exportExcel }));

const snapshot = {
  items: [{
    codigo: 'COD-1', nombre: 'Producto de prueba', marca: 'Marca', modelo: 'Modelo', subtipoNombre: 'Categoría',
    precioListaArs: 100, descuentoTotalPorcentaje: 10, precioFinalArs: 90, precioFinalUsd: null, iva: 21,
  }],
  contexto_monetario: { cotizacion_usd_ars: null, cotizacion_version: 'v1', actualizada_at: null },
  sucursal: { id: 's1', nombre: 'Centro' },
  cliente: { id: 'c1', nombre: 'Cliente', descuento_porcentaje: 10, regionNombre: null, regionDescuento: null },
} as ListaPreciosCliente;

function props(clienteActivo = true) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    clienteId: 'c1',
    clienteNombre: 'Cliente',
    clienteActivo,
    sucursales: [{ id: 's1', nombre: 'Centro' }],
  };
}

function estadoLista() {
  const filtrar = (items: ListaPreciosCliente['items']) => items;
  return {
    datos: snapshot,
    itemsFiltrados: snapshot.items,
    cargando: false,
    hayCotizacion: false,
    filtroActivo: false,
    revalidarAcceso: mocks.revalidarAcceso,
    esSnapshotVigente: () => mocks.snapshotVigente,
    sucursalId: 's1',
    filtrar,
    disponible: true,
    recargar: vi.fn(async () => snapshot),
  };
}

describe('ClienteListaPreciosModal exportación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.snapshotVigente = true;
    mocks.useLista.mockReturnValue(estadoLista());
    mocks.revalidarAcceso.mockResolvedValue(snapshot);
    mocks.comprobar.mockImplementation(async (options: { conservar: () => Promise<void> }) => options.conservar());
  });

  it('revalida y exporta el snapshot completo vigente', async () => {
    render(<ClienteListaPreciosModal {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar columnas' }));

    await waitFor(() => expect(mocks.exportPdf).toHaveBeenCalledTimes(1));
    expect(mocks.revalidarAcceso).toHaveBeenCalledTimes(1);
    expect(mocks.exportExcel).not.toHaveBeenCalled();
  });

  it.each(['PDF', 'Excel'])('no descarga %s si el snapshot cambia durante el diálogo', (formato) => {
    const modalProps = props();
    const { rerender } = render(<ClienteListaPreciosModal {...modalProps} />);
    fireEvent.click(screen.getByRole('button', { name: `Exportar ${formato}` }));

    mocks.snapshotVigente = false;
    mocks.useLista.mockReturnValue(estadoLista());
    rerender(<ClienteListaPreciosModal {...modalProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar columnas' }));

    expect(mocks.comprobar).not.toHaveBeenCalled();
    expect(mocks.revalidarAcceso).not.toHaveBeenCalled();
    expect(mocks.exportPdf).not.toHaveBeenCalled();
    expect(mocks.exportExcel).not.toHaveBeenCalled();
    expect(mocks.showError).toHaveBeenCalledWith('La selección o disponibilidad cambió. Volvé a cargar la lista antes de exportar.');
  });

  it('deshabilita exportación y cierra el modal si el cliente se inactiva', () => {
    const modalProps = props(true);
    const { rerender } = render(<ClienteListaPreciosModal {...modalProps} />);
    rerender(<ClienteListaPreciosModal {...modalProps} clienteActivo={false} />);

    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeDisabled();
    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
    expect(mocks.exportPdf).not.toHaveBeenCalled();
    expect(mocks.exportExcel).not.toHaveBeenCalled();
  });
});
