import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListaPreciosCatalogo from './ListaPreciosCatalogo';
import { ContextoMonetario } from '../../../../../lib/types/Moneda';
import { StockItem } from '../../../../../lib/types/Stock';
import { ItemConMargenCalculado } from '../../../../../lib/types/ListaPreciosCliente';

const mocks = vi.hoisted(() => ({
  listaState: null as unknown,
  comprobar: vi.fn(),
  revalidarAcceso: vi.fn(),
  exportExcel: vi.fn(),
  exportPdf: vi.fn(),
}));

vi.mock('../../_hooks/useListaPrecios', () => ({ useListaPrecios: () => mocks.listaState }));
vi.mock('../../../../../lib/hooks/useClasificacion', () => ({
  useClasificacion: () => ({ getSubtipoNombre: (id: string) => id }),
}));
vi.mock('../../../../../lib/hooks/useExportacionCotizacion', () => ({
  useExportacionCotizacion: () => ({ comprobar: mocks.comprobar, ocupado: false, dialogo: null }),
}));
vi.mock('../../../../../components/ExportarColumnasModal/ExportarColumnasModal', () => ({
  default: ({ onConfirm }: { onConfirm: (keys: string[]) => void }) => (
    <button type="button" onClick={() => onConfirm(['nombre', 'precioFinalArs'])}>Confirmar columnas</button>
  ),
}));
vi.mock('../../_lib/exportExcel', () => ({ exportarListaPreciosExcel: mocks.exportExcel }));
vi.mock('../../_lib/exportPdf', () => ({ exportarListaPreciosPdf: mocks.exportPdf }));

const contexto = {
  cotizacion_usd_ars: null,
  cotizacion_version: 'v1',
  actualizada_at: null,
  origen: 'TENANT',
  sucursal_id: null,
} as ContextoMonetario;

const item = {
  id: 'ps1', productoId: 'p1', sucursalId: 's1', sucursalNombre: 'Centro', codigo: 'COD-1',
  nombre: 'Producto de prueba', marca: 'Marca', modelo: 'Modelo', imagenUrl: '', subtipoId: 'subtipo',
  precioBase: 100, activo: true, costoReposicion: 50, precioVentaArs: 100, precioVentaUsd: null,
  contextoMonetario: contexto, iva: 21, margenMinimo: 0, descuento: null, stockMinimo: 0,
  cantidadDisponible: 1, cantidadReservada: 0,
} as StockItem;

const precio = {
  id: 'ps1', productoId: 'p1', codigo: 'COD-1', nombre: 'Producto de prueba', subtipoNombre: 'subtipo',
  precioListaArs: 100, descuentoTotalPorcentaje: 10, precioFinalArs: 90, precioFinalUsd: null,
  precioSinTope: 90, precioMinimo: 50, costoReposicion: 50, margenMinimo: 0,
  noAlcanzaMargen: false, descuentosDetalle: [],
} as ItemConMargenCalculado;

function listaCompleta() {
  const precios = new Map([['ps1', precio]]);
  return {
    sucursalId: 's1',
    sucursalOptions: [{ value: 's1', label: 'Centro' }],
    regionId: '',
    regionOptions: [],
    onRegionChange: vi.fn(),
    regionNombre: null,
    contexto,
    error: null,
    actualizarSeleccion: vi.fn(),
    revalidarAcceso: mocks.revalidarAcceso,
    precios,
    puedeExportar: true,
    reintentar: vi.fn(),
    items: [item],
    pageItems: [item],
    page: 1,
    totalPages: 1,
    setPage: vi.fn(),
    isLoading: false,
    sucursalNombre: 'Centro',
    sort: [],
    onSortChange: vi.fn(),
    search: '',
    onSearchChange: vi.fn(),
    filters: { sucursal: 's1', marca: '', modelo: '', subtipo: '' },
    onFilterChange: vi.fn(),
    filterOptions: { sucursal: [{ value: 's1', label: 'Centro' }] },
  };
}

describe('ListaPreciosCatalogo exportación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listaState = listaCompleta();
    mocks.revalidarAcceso.mockResolvedValue(undefined);
    mocks.comprobar.mockImplementation(async (options: { conservar: () => Promise<void> }) => options.conservar());
  });

  it('revalida y exporta el snapshot completo vigente', async () => {
    render(<ListaPreciosCatalogo />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar columnas' }));

    await waitFor(() => expect(mocks.exportPdf).toHaveBeenCalledTimes(1));
    expect(mocks.revalidarAcceso).toHaveBeenCalledTimes(1);
    expect(mocks.exportExcel).not.toHaveBeenCalled();
  });

  it.each(['PDF', 'Excel'])('bloquea una confirmación de %s si el snapshot quedó incompleto', async (formato) => {
    const { rerender } = render(<ListaPreciosCatalogo />);
    fireEvent.click(screen.getByRole('button', { name: `Exportar ${formato}` }));

    mocks.listaState = {
      ...listaCompleta(),
      contexto: null,
      precios: new Map(),
      items: [],
      pageItems: [],
      puedeExportar: false,
      isLoading: true,
    };
    rerender(<ListaPreciosCatalogo />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar columnas' }));

    expect(mocks.comprobar).not.toHaveBeenCalled();
    expect(mocks.exportPdf).not.toHaveBeenCalled();
    expect(mocks.exportExcel).not.toHaveBeenCalled();
    expect(mocks.revalidarAcceso).not.toHaveBeenCalled();
  });

  it('mantiene deshabilitadas las descargas mientras la lista no está preparada', () => {
    mocks.listaState = {
      ...listaCompleta(),
      contexto: null,
      precios: new Map(),
      items: [],
      pageItems: [],
      puedeExportar: false,
      isLoading: true,
    };
    render(<ListaPreciosCatalogo />);

    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeDisabled();
  });
});
