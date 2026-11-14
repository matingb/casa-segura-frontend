import { fireEvent, render, screen, waitFor, act, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogoApiError } from '../../../../lib/api/apiError';
import { ListaPreciosCliente } from '../../../../lib/types/ListaPreciosCliente';
import ClienteForm from './ClienteForm';

const mocks = vi.hoisted(() => ({
  obtenerPorId: vi.fn(),
  actualizar: vi.fn(),
  obtenerParaAdmin: vi.fn(),
  obtenerDescuentos: vi.fn(),
  listaCliente: vi.fn(),
  obtenerCotizacion: vi.fn(),
  push: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  exportPdf: vi.fn(),
  exportExcel: vi.fn(),
  sucursalesContexto: [{ id: 's1', nombre: 'Centro', activo: true }],
  clienteActivo: false,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('../../../../context/SucursalContext', () => ({
  useSucursales: () => ({ sucursales: mocks.sucursalesContexto }),
}));
vi.mock('../../../../context/ToastContext', () => ({
  useToast: () => ({ showError: mocks.showError, showSuccess: mocks.showSuccess }),
}));
vi.mock('../../../../lib/api/cliente.client', () => ({
  clienteClient: { obtenerPorId: mocks.obtenerPorId, actualizar: mocks.actualizar },
}));
vi.mock('../../../../lib/api/sucursal.client', () => ({
  sucursalClient: { obtenerParaAdmin: mocks.obtenerParaAdmin },
}));
vi.mock('../../../../lib/api/cliente-descuento.client', () => ({
  clienteDescuentoClient: { obtenerDescuentos: mocks.obtenerDescuentos },
}));
vi.mock('../../../../lib/api/descuento-engine.client', () => ({
  descuentoEngineClient: { listaCliente: mocks.listaCliente },
}));
vi.mock('../../../../lib/api/cotizacion.client', () => ({
  cotizacionClient: { obtener: mocks.obtenerCotizacion },
}));

vi.mock('./ClienteDescuentos/SeccionDescuento', () => ({
  default: ({ children, titulo, resumen }: { children: React.ReactNode; titulo: string; resumen?: string | null }) => (
    <section><h3>{titulo}</h3>{resumen && <span>{resumen}</span>}{children}</section>
  ),
}));
vi.mock('./ClienteDescuentos/RegionSelector', () => ({ default: () => null }));
vi.mock('./ClienteDescuentos/DescuentoCategoriaEditor', () => ({ default: () => null }));
vi.mock('./ClienteDescuentos/DescuentoProductoEditor', () => ({ default: () => null }));
vi.mock('./ProvinciaSelect', () => ({ default: () => null }));
vi.mock('./ClienteListaPreciosModal/exportPdfCliente', () => ({ exportarListaPreciosClientePdf: mocks.exportPdf }));
vi.mock('./ClienteListaPreciosModal/exportExcelCliente', () => ({ exportarListaPreciosClienteExcel: mocks.exportExcel }));

const cliente = {
  id: 'c1',
  nombre: 'Cliente de prueba',
  tipoCliente: 'empresa' as const,
  razonSocial: 'Cliente de prueba SRL',
  nombreContacto: '',
  sucursales: [{ id: 's1', nombre: 'Centro' }],
  tipoDocumento: 'CUIT',
  nroDocumento: '30-00000000-0',
  condicionIva: '',
  email: '',
  telefono: '',
  direccion: '',
  localidad: '',
  provincia: '',
  codigoPostal: '',
  descuentoPorcentaje: 10,
  observaciones: '',
  activo: false,
};

const descuentos = {
  clienteId: 'c1',
  descuentoGeneral: 10,
  regiones: [],
  categorias: [{
    id: 'dc1', clienteId: 'c1', tipoId: 't1', tipoNombre: 'Herramientas', subtipoId: null,
    subtipoNombre: null, categoriaPadreId: null, categoriaPadreNombre: null, porcentaje: 5, nota: null,
  }],
  productos: [],
};

function listaCliente(): ListaPreciosCliente {
  return {
    items: [],
    contexto_monetario: { cotizacion_usd_ars: null, cotizacion_version: 'v1', actualizada_at: null, origen: 'TENANT', sucursal_id: null },
    sucursal: { id: 's1', nombre: 'Centro' },
    cliente: { id: 'c1', nombre: 'Cliente de prueba', descuento_porcentaje: 10, regionNombre: null, regionDescuento: null },
  };
}

function listaClienteConProducto(): ListaPreciosCliente {
  return {
    ...listaCliente(),
    items: [{
      id: 'ps1', productoId: 'p1', codigo: 'COD-1', nombre: 'Producto de prueba', marca: 'Marca', modelo: 'Modelo',
      subtipoNombre: 'Categoría', precioListaArs: 100, descuentoTotalPorcentaje: 10, precioFinalArs: 90,
      precioFinalUsd: null, iva: 21, descuentosDetalle: [], precioSinTope: 90, precioMinimo: 50,
      costoReposicion: 50, margenMinimo: 0, noAlcanzaMargen: false,
    }],
  };
}

function pendiente<T>() {
  let resolver!: (value: T) => void;
  const promise = new Promise<T>((resolve) => { resolver = resolve; });
  return { promise, resolver };
}

describe('ClienteForm: ciclo de lista de precios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clienteActivo = false;
    mocks.obtenerPorId.mockImplementation(async () => ({ ...cliente, activo: mocks.clienteActivo, sucursales: [...cliente.sucursales] }));
    mocks.actualizar.mockImplementation(async (_id: string, datos: { activo: boolean }) => {
      mocks.clienteActivo = datos.activo;
      return { accesoRevocado: false };
    });
    mocks.obtenerParaAdmin.mockResolvedValue([{ ...mocks.sucursalesContexto[0] }]);
    mocks.obtenerDescuentos.mockResolvedValue(descuentos);
    mocks.obtenerCotizacion.mockResolvedValue({
      sucursal_id: null,
      cotizacion_usd_ars: null,
      cotizacion_version: 'v1',
      origen: 'TENANT',
      sugerencias_sucursales: [],
    });
    mocks.listaCliente.mockImplementation(() => Promise.reject(new CatalogoApiError('La lista de precios no está disponible', 'RECURSO_NO_DISPONIBLE', 404)));
  });

  it('abre por URL directa un cliente inactivo y conserva sus descuentos sin pedir precios ni cotización', async () => {
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);

    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));

    expect(await screen.findByText(/Los descuentos configurados se conservan y pueden administrarse/)).toBeInTheDocument();
    expect(screen.getByText('1 descuento asignado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lista de precios' })).toBeDisabled();
    expect(mocks.obtenerDescuentos).toHaveBeenCalledTimes(1);
    expect(mocks.listaCliente).not.toHaveBeenCalled();
    expect(mocks.obtenerCotizacion).not.toHaveBeenCalled();
  });

  it('contiene un 404 de lista con un único intento, una comprobación silenciosa y cero eventos globales', async () => {
    let eventosGlobales = 0;
    const contarEvento = () => { eventosGlobales += 1; };
    mocks.obtenerPorId.mockImplementation(async () => ({ ...cliente, activo: true, sucursales: [...cliente.sucursales] }));
    window.addEventListener('alcance-pdv-revocado', contarEvento);
    try {
      // Tope de seguridad: el código regresivo no puede mantener vivo el test
      // con una sucesión ilimitada de requests.
      mocks.listaCliente.mockImplementation(async () => {
        if (mocks.listaCliente.mock.calls.length > 4) throw new Error('Se excedió el límite de requests del test');
        throw new CatalogoApiError('La lista de precios no está disponible', 'RECURSO_NO_DISPONIBLE', 404);
      });
      render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);

      await screen.findByRole('heading', { name: 'Cliente de prueba' });
      const consultasDetalleIniciales = mocks.obtenerPorId.mock.calls.length;
      fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));

      expect(await screen.findByText(/La lista de precios no está disponible/)).toBeInTheDocument();
      await waitFor(() => expect(mocks.obtenerPorId).toHaveBeenCalledTimes(consultasDetalleIniciales + 1));
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

      expect(mocks.listaCliente).toHaveBeenCalledTimes(1);
      expect(mocks.obtenerPorId).toHaveBeenCalledTimes(consultasDetalleIniciales + 1);
      expect(eventosGlobales).toBe(0);
      expect(screen.getByText(/Los descuentos configurados siguen visibles y administrables/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Reintentar lista' }));
      await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(mocks.obtenerPorId).toHaveBeenCalledTimes(consultasDetalleIniciales + 2));
      expect(eventosGlobales).toBe(0);
    } finally {
      window.removeEventListener('alcance-pdv-revocado', contarEvento);
    }
  });

  it('espera la primera cotización antes de cargar la lista y hace un solo cálculo inicial', async () => {
    const cotizacionLenta = pendiente<{
      sucursal_id: string;
      cotizacion_usd_ars: string | null;
      cotizacion_version: string;
      sugerencias_sucursales: [];
    }>();
    mocks.obtenerPorId.mockImplementation(async () => ({ ...cliente, activo: true, sucursales: [...cliente.sucursales] }));
    mocks.obtenerCotizacion.mockReturnValue(cotizacionLenta.promise);
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);

    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    expect(mocks.obtenerCotizacion).not.toHaveBeenCalled();
    expect(mocks.listaCliente).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));
    await waitFor(() => expect(mocks.obtenerCotizacion).toHaveBeenCalledTimes(1));
    expect(mocks.listaCliente).not.toHaveBeenCalled();

    await act(async () => {
      cotizacionLenta.resolver({
        sucursal_id: 's1',
        cotizacion_usd_ars: null,
        cotizacion_version: 'v1',
        sugerencias_sucursales: [],
      });
    });
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(1));
    expect(mocks.obtenerPorId).toHaveBeenCalledTimes(2);
  });

  it('conserva los descuentos y habilita una nueva carga al reactivar el cliente', async () => {
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);
    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));
    expect(await screen.findByText(/Los descuentos configurados se conservan y pueden administrarse/)).toBeInTheDocument();
    expect(screen.getByText('1 descuento asignado')).toBeInTheDocument();
    expect(mocks.listaCliente).not.toHaveBeenCalled();
    expect(mocks.obtenerCotizacion).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: /Información del Cliente/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar información' }));
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'true' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mocks.actualizar).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ver lista de precios' })).toBeEnabled());
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(1));
    expect(mocks.obtenerCotizacion).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Los descuentos configurados siguen visibles y administrables/)).toBeInTheDocument();
  });

  it('pausa la pestaña de descuentos al abrir el modal y descarta la respuesta que llega tarde', async () => {
    const cargaPestana = pendiente<ListaPreciosCliente>();
    const cargaModal = pendiente<ListaPreciosCliente>();
    mocks.clienteActivo = true;
    mocks.listaCliente.mockReset();
    mocks.listaCliente.mockReturnValueOnce(cargaPestana.promise).mockReturnValueOnce(cargaModal.promise);
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);

    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Ver lista de precios' }));
    await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(2));

    await act(async () => { cargaPestana.resolver(listaCliente()); });
    await act(async () => { cargaModal.resolver(listaCliente()); });
    expect(await screen.findByRole('dialog', { name: 'Lista de precios de Cliente de prueba' })).toBeInTheDocument();
    expect(mocks.listaCliente).toHaveBeenCalledTimes(2);
    expect(mocks.obtenerCotizacion).toHaveBeenCalledTimes(2);
  });

  it('muestra el error del resumen y permite una recuperación manual', async () => {
    mocks.obtenerDescuentos.mockRejectedValueOnce(new Error('Resumen sin conexión'));
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);
    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Resumen sin conexión');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
    mocks.obtenerDescuentos.mockResolvedValueOnce(descuentos);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('1 descuento asignado')).toBeInTheDocument();
    expect(mocks.obtenerDescuentos).toHaveBeenCalledTimes(2);
    expect(mocks.listaCliente).not.toHaveBeenCalled();
    expect(mocks.obtenerCotizacion).not.toHaveBeenCalled();
  });

  it('bloquea la descarga si la revalidación del modal encuentra un 404', async () => {
    let eventosGlobales = 0;
    const contarEvento = () => { eventosGlobales += 1; };
    mocks.clienteActivo = true;
    mocks.obtenerCotizacion.mockResolvedValue({
      sucursal_id: null,
      cotizacion_usd_ars: null,
      cotizacion_version: 'v1',
      origen: 'TENANT',
      sugerencias_sucursales: [],
    });
    mocks.listaCliente.mockReset()
      .mockResolvedValueOnce(listaClienteConProducto())
      .mockRejectedValueOnce(new CatalogoApiError('La lista de precios ya no está disponible', 'RECURSO_NO_DISPONIBLE', 404));
    window.addEventListener('alcance-pdv-revocado', contarEvento);
    try {
      render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);
      await screen.findByRole('heading', { name: 'Cliente de prueba' });
      fireEvent.click(screen.getByRole('button', { name: 'Ver lista de precios' }));
      await screen.findByText('Producto de prueba');
      fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
      const selectorColumnas = await screen.findByRole('dialog', { name: /Exportar lista de precios de Cliente/ });
      fireEvent.click(within(selectorColumnas).getByLabelText('Nombre'));
      fireEvent.click(within(selectorColumnas).getByRole('button', { name: 'Exportar PDF' }));

      await waitFor(() => expect(mocks.listaCliente).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(mocks.obtenerPorId).toHaveBeenCalledTimes(2));
      expect(mocks.exportPdf).not.toHaveBeenCalled();
      expect(mocks.exportExcel).not.toHaveBeenCalled();
      expect(eventosGlobales).toBe(0);
    } finally {
      window.removeEventListener('alcance-pdv-revocado', contarEvento);
    }
  });

  it('conserva descuentos, pero bloquea la lista si el cliente se inactiva durante la comprobación', async () => {
    mocks.obtenerPorId.mockResolvedValueOnce({ ...cliente, activo: true, sucursales: [...cliente.sucursales] })
      .mockResolvedValueOnce({ ...cliente, activo: false, sucursales: [...cliente.sucursales] });
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);
    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));

    await waitFor(() => expect(mocks.obtenerPorId).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/El cliente está inactivo/)).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver lista de precios' })).toBeDisabled();
    expect(screen.getByText('1 descuento asignado')).toBeInTheDocument();
    expect(mocks.listaCliente).toHaveBeenCalledTimes(1);
  });

  it('bloquea el PDV retirado sin perder los descuentos del cliente todavía accesible', async () => {
    mocks.obtenerPorId.mockResolvedValueOnce({ ...cliente, activo: true, sucursales: [...cliente.sucursales] })
      .mockResolvedValueOnce({ ...cliente, activo: true, sucursales: [] });
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);
    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));

    await waitFor(() => expect(mocks.obtenerPorId).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Ver lista de precios' })).toBeDisabled();
    expect(screen.getByText('1 descuento asignado')).toBeInTheDocument();
    expect(mocks.listaCliente).toHaveBeenCalledTimes(1);
  });

  it('mantiene el error recuperable y estable si falla el transporte de la comprobación silenciosa', async () => {
    mocks.obtenerPorId.mockResolvedValueOnce({ ...cliente, activo: true, sucursales: [...cliente.sucursales] })
      .mockRejectedValueOnce(new TypeError('Red sin conexión'));
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);
    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));

    expect(await screen.findByText(/La lista de precios no está disponible/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.showError).toHaveBeenCalledWith(expect.stringContaining('Red sin conexión')));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(screen.getByRole('heading', { name: 'Cliente de prueba' })).toBeInTheDocument();
    expect(mocks.obtenerPorId).toHaveBeenCalledTimes(2);
    expect(mocks.listaCliente).toHaveBeenCalledTimes(1);
  });

  it('retira el detalle y los descuentos cuando la comprobación confirma un 404', async () => {
    mocks.obtenerPorId.mockResolvedValueOnce({ ...cliente, activo: true, sucursales: [...cliente.sucursales] })
      .mockRejectedValueOnce(new CatalogoApiError('Cliente fuera de alcance', 'RECURSO_NO_DISPONIBLE', 404));
    render(<ClienteForm title="Detalle del cliente" clienteId="c1" readOnly />);
    await screen.findByRole('heading', { name: 'Cliente de prueba' });
    fireEvent.click(screen.getByRole('tab', { name: /Descuentos del cliente/ }));

    expect(await screen.findByText('El cliente ya no está disponible dentro de tu alcance.')).toBeInTheDocument();
    expect(screen.queryByText('1 descuento asignado')).not.toBeInTheDocument();
    expect(mocks.listaCliente).toHaveBeenCalledTimes(1);
  });
});
