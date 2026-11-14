import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListaPreciosCatalogo from './ListaPreciosCatalogo';
import { useListaPrecios } from '../../_hooks/useListaPrecios';
import { useClasificacion } from '../../../../../lib/hooks/useClasificacion';
import { useExportacionCotizacion } from '../../../../../lib/hooks/useExportacionCotizacion';

vi.mock('../../_hooks/useListaPrecios');
vi.mock('../../../../../lib/hooks/useClasificacion');
vi.mock('../../../../../lib/hooks/useExportacionCotizacion');
vi.mock('../../_lib/exportExcel', () => ({ exportarListaPreciosExcel: vi.fn() }));
vi.mock('../../_lib/exportPdf', () => ({ exportarListaPreciosPdf: vi.fn() }));

describe('ListaPreciosCatalogo UI con región', () => {
  const onFilterChangeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useClasificacion).mockReturnValue({
      getSubtipoNombre: () => 'Cámaras',
    } as any);

    vi.mocked(useExportacionCotizacion).mockReturnValue({
      comprobar: vi.fn(),
      ocupado: false,
      dialogo: null,
    } as any);

    vi.mocked(useListaPrecios).mockReturnValue({
      sucursalId: 'suc-1',
      sucursalOptions: [{ value: 'suc-1', label: 'Sucursal Central' }],
      sucursalNombre: 'Sucursal Central',
      regionId: '',
      regionOptions: [
        { value: '', label: 'Sin región' },
        { value: 'reg-1', label: 'CABA (2%)' },
      ],
      regionNombre: '',
      regionesDisponibles: 1,
      cargandoRegiones: false,
      contexto: null,
      error: null,
      actualizarSeleccion: vi.fn(),
      revalidarAcceso: vi.fn(),
      precios: new Map([
        [
          'item-1',
          {
            id: 'item-1',
            precioListaArs: 1000,
            precioFinalArs: 1000,
            precioFinalUsd: 1,
            descuentoTotalPorcentaje: 0,
            descuentosAportes: [],
          } as any,
        ],
      ]),
      items: [
        {
          id: 'item-1',
          codigo: 'CAM-01',
          nombre: 'Cámara Domo',
          marca: 'Hikvision',
          modelo: 'DS-2CE',
          subtipoId: 'sub-1',
          precioVentaArs: 1000,
          precioVentaUsd: 1,
          iva: 21,
          activo: true,
          sucursalId: 'suc-1',
        } as any,
      ],
      pageItems: [
        {
          id: 'item-1',
          codigo: 'CAM-01',
          nombre: 'Cámara Domo',
          marca: 'Hikvision',
          modelo: 'DS-2CE',
          subtipoId: 'sub-1',
          precioVentaArs: 1000,
          precioVentaUsd: 1,
          iva: 21,
          activo: true,
          sucursalId: 'suc-1',
        } as any,
      ],
      page: 1,
      totalPages: 1,
      setPage: vi.fn(),
      isLoading: false,
      sort: [],
      onSortChange: vi.fn(),
      search: '',
      onSearchChange: vi.fn(),
      filters: {},
      onFilterChange: onFilterChangeMock,
      filterOptions: {
        sucursal: [{ value: 'suc-1', label: 'Sucursal Central' }],
        region: [
          { value: '', label: 'Sin región' },
          { value: 'reg-1', label: 'CABA (2%)' },
        ],
      },
    } as any);
  });

  it('muestra el selector de sucursal y al lado el selector de región', () => {
    render(<ListaPreciosCatalogo />);

    // Selector de sucursal
    expect(screen.getByDisplayValue('Sucursal Central')).toBeInTheDocument();

    // Selector de región (por defecto Sin región)
    expect(screen.getByDisplayValue('Sin región')).toBeInTheDocument();
  });

  it('permite cambiar de región usando el combobox', () => {
    render(<ListaPreciosCatalogo />);

    const regionInput = screen.getByDisplayValue('Sin región');
    fireEvent.mouseDown(regionInput);
    fireEvent.click(regionInput);

    const opcionCaba = screen.getByRole('option', { name: 'CABA (2%)' });
    fireEvent.mouseDown(opcionCaba);

    expect(onFilterChangeMock).toHaveBeenCalledWith('region', 'reg-1');
  });
});
