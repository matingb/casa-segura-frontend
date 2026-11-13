import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductoForm from './ProductoForm';
import { CatalogoApiError } from '../../../../lib/api/apiError';
import { productoClient } from '../../../../lib/api/producto.client';
import { Producto } from '../../../../lib/types/Producto';
import { useSucursales } from '../../../../context/SucursalContext';

const { cotizacion, toast, push } = vi.hoisted(() => ({
  cotizacion: { cotizacion_usd_ars: '1000.000000', cotizacion_version: '3', actualizada_at: null },
  toast: { showError: vi.fn(), showSuccess: vi.fn() },
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => toast }));
vi.mock('../../../../context/CotizacionContext', () => ({ useCotizacion: () => ({ datos: cotizacion, recargar: vi.fn(), error: null }) }));
vi.mock('../../../../context/SucursalContext', () => ({ useSucursales: vi.fn() }));
vi.mock('../../../../lib/hooks/useClasificacion', () => ({
  useClasificacion: () => ({
    tipos: [], loading: false, getSubtiposPorTipo: () => [], getTipoIdDeSubtipo: () => '',
    getTipoNombre: () => '', getSubtipoNombre: () => '',
  }),
}));
vi.mock('../_hooks/useProductoDetalle', () => ({ useProductoDetalle: () => ({ producto: null, isLoading: false, error: null, reload: vi.fn() }) }));
vi.mock('../../../../lib/api/producto.client', () => ({
  productoClient: { obtenerTodos: vi.fn(), obtenerPorId: vi.fn(), crear: vi.fn(), actualizar: vi.fn() },
}));

const original = {
  id: 'p1', codigo: 'CAM-001', nombre: 'Cámara domo', marca: 'Hikvision', modelo: 'DS-2', color: 'Blanco',
  presentacion: 'Unidad', subtipoId: '', codigoBarraProveedor: '', descripcion: 'Exterior', activo: true,
  alto: 0, ancho: 0, profundidad: 0, pesoUnitario: 0, unidadAlto: 'cm', unidadAncho: 'cm', unidadProfundidad: 'cm',
  unidadPesoUnitario: 'kg', imagenUrl: '', codigoQr: '', descuentoBase: null, precioBase: 5000, costoReposicionBase: null,
  precio: { moneda_referencia: 'ARS', importe_referencia: '5000.00', ars: '5000.00', usd: '5.0000', estado: 'VINCULADO' },
} as unknown as Producto;

const sucursales = [
  { id: 's1', nombre: 'Casa Central', activo: true },
  { id: 's2', nombre: 'Norte', activo: true },
  { id: 's3', nombre: 'Sur', activo: false },
];

beforeEach(() => {
  vi.mocked(useSucursales).mockReturnValue({
    sucursales, isLoading: false, error: null, recargarSucursales: vi.fn(), sucursalOptions: [],
  } as unknown as ReturnType<typeof useSucursales>);
});

it('muestra la imagen existente y la quita al guardar', async () => {
  const producto = { ...original, imagenUrl: '/camara.png' };
  vi.mocked(productoClient.actualizar).mockResolvedValue({ ...producto, codigo: 'CAM + 001/Ñ', imagenUrl: '' });
  render(<ProductoForm title="Editar producto" producto={producto} />);
  expect(screen.queryByRole('combobox', { name: 'Agregar sucursal' })).not.toBeInTheDocument();

  expect(screen.getByRole('img', { name: 'Vista previa del producto' })).toHaveAttribute('src', '/camara.png');
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar imagen' }));
  expect(screen.queryByRole('img', { name: 'Vista previa del producto' })).not.toBeInTheDocument();
  expect(productoClient.actualizar).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(productoClient.actualizar).toHaveBeenCalledWith('p1', expect.objectContaining({ imagen_url: null }), undefined));
  expect(push).toHaveBeenCalledWith('/productos?buscar=CAM+%2B+001%2F%C3%91');
});

it('muestra las sucursales en el detalle y permite cambiar solo la asignación', async () => {
  const producto = { ...original, sucursales: [{ id: 's1', nombre: 'Casa Central' }] };
  vi.mocked(productoClient.actualizar).mockResolvedValue(producto);
  render(<ProductoForm title="Producto" producto={producto} readOnly />);
  expect(screen.getByText('Casa Central')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  expect(screen.getByRole('button', { name: 'Quitar Casa Central' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar Casa Central' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await waitFor(() => expect(productoClient.actualizar).toHaveBeenCalledWith('p1', expect.objectContaining({ sucursal_ids: [] }), undefined));
});

describe('Sucursales al crear un producto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productoClient.obtenerTodos).mockResolvedValue([]);
    vi.mocked(productoClient.crear).mockResolvedValue(original);
  });

  function completarProducto() {
    fireEvent.change(screen.getByRole('textbox', { name: 'Código' }), { target: { value: 'CAM-001' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre' }), { target: { value: 'Cámara domo' } });
  }

  it('permite buscar y elegir varias sucursales con el teclado y quitar una antes de guardar', async () => {
    render(<ProductoForm title="Nuevo producto" />);
    completarProducto();
    const selector = screen.getByRole('combobox', { name: 'Agregar sucursal' });
    fireEvent.focus(selector);
    expect(screen.queryByRole('option', { name: 'Sur' })).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'Central' } });
    fireEvent.keyDown(selector, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Quitar Casa Central' })).toBeInTheDocument();
    fireEvent.focus(selector);
    expect(screen.queryByRole('option', { name: 'Casa Central' })).not.toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'Norte' } });
    fireEvent.keyDown(selector, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Quitar Norte' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Casa Central' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(productoClient.crear).toHaveBeenCalledWith(expect.objectContaining({ sucursal_ids: ['s2'] }), undefined));
  });

  it('permite guardar solo en el catálogo general', async () => {
    render(<ProductoForm title="Nuevo producto" />);
    completarProducto();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(productoClient.crear).toHaveBeenCalledWith(expect.objectContaining({ sucursal_ids: [] }), undefined));
  });

  it('envía juntas todas las sucursales elegidas', async () => {
    render(<ProductoForm title="Nuevo producto" />);
    completarProducto();
    const selector = screen.getByRole('combobox', { name: 'Agregar sucursal' });
    for (const nombre of ['Casa Central', 'Norte']) {
      fireEvent.focus(selector);
      fireEvent.mouseDown(screen.getByRole('option', { name: nombre }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(productoClient.crear).toHaveBeenCalledWith(expect.objectContaining({ sucursal_ids: ['s1', 's2'] }), undefined));
  });

  it('bloquea guardar si una sucursal seleccionada pierde el acceso', () => {
    const { rerender } = render(<ProductoForm title="Nuevo producto" />);
    const selector = screen.getByRole('combobox', { name: 'Agregar sucursal' });
    fireEvent.focus(selector);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Norte' }));
    vi.mocked(useSucursales).mockReturnValue({
      sucursales: [], isLoading: false, error: null, recargarSucursales: vi.fn(), sucursalOptions: [],
    });
    rerender(<ProductoForm title="Nuevo producto" />);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Sucursal no disponible' }));
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });
});

describe('Nuevo producto copiando otro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productoClient.obtenerTodos).mockResolvedValue([original]);
    vi.mocked(productoClient.obtenerPorId).mockResolvedValue(original);
    vi.mocked(productoClient.crear).mockResolvedValue(original);
  });

  it('precarga todos los datos y no deja guardar sin cambios', async () => {
    render(<ProductoForm title="Nuevo producto" copiarDeId="p1" />);

    expect(await screen.findByDisplayValue('Cámara domo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CAM-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hikvision')).toBeInTheDocument();
    expect(screen.getByLabelText('Precio base global')).toHaveValue(5000);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled());
    expect(screen.getAllByText('Cambiá al menos un dato respecto del producto copiado.').length).toBeGreaterThan(0);
  });

  it('con un dato distinto guarda la copia completa', async () => {
    render(<ProductoForm title="Nuevo producto" copiarDeId="p1" />);
    const codigo = await screen.findByDisplayValue('CAM-001');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled());

    fireEvent.change(codigo, { target: { value: 'CAM-002' } });
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    await waitFor(() => expect(guardar).toBeEnabled());
    fireEvent.click(guardar);

    await waitFor(() => expect(productoClient.crear).toHaveBeenCalled());
    const payload = vi.mocked(productoClient.crear).mock.calls[0][0];
    expect(payload).toMatchObject({ codigo: 'CAM-002', nombre: 'Cámara domo', marca: 'Hikvision', descripcion: 'Exterior' });
    expect(payload.precio).toEqual({ moneda_referencia: 'ARS', importe_referencia: '5000.00', cotizacion_version: '3' });
  });

  it('marca el código duplicado y permite guardar después de corregirlo', async () => {
    const mensaje = 'Ya existe un producto con el código "CAM-001". Usá otro código.';
    vi.mocked(productoClient.crear)
      .mockRejectedValueOnce(new CatalogoApiError(mensaje, 'CODIGO_PRODUCTO_DUPLICADO', 409))
      .mockResolvedValueOnce({ ...original, codigo: 'CAM-002' });
    render(<ProductoForm title="Nuevo producto" copiarDeId="p1" />);
    const codigo = await screen.findByDisplayValue('CAM-001');
    fireEvent.change(screen.getByDisplayValue('Cámara domo'), { target: { value: 'Cámara nueva' } });
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    await waitFor(() => expect(guardar).toBeEnabled());
    fireEvent.click(guardar);

    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
    expect(codigo).toHaveAttribute('aria-invalid', 'true');
    expect(codigo).toHaveAccessibleDescription(mensaje);
    expect(codigo).toHaveFocus();
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(codigo, { target: { value: 'CAM-002' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(guardar);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/productos?buscar=CAM-002'));
    expect(productoClient.crear).toHaveBeenLastCalledWith(expect.objectContaining({ codigo: 'CAM-002' }), undefined);
  });
});
