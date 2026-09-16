import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VentaForm from './VentaForm';
import CompraForm from './CompraForm';
import TrasladoForm from './TrasladoForm';
import MovimientoForm from './MovimientoForm';
import PagoEditor from './PagoEditor';
import { useSucursales } from '../../../../../context/SucursalContext';
import { stockClient } from '../../../../../lib/api/stock.client';
import { cuentaFinancieraClient } from '../../../../../lib/api/cuenta-financiera.client';
import { proveedorClient } from '../../../../../lib/api/proveedor.client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('../../../../../context/SucursalContext', () => ({
  useSucursales: vi.fn(),
}));

vi.mock('../../../../../context/ToastContext', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('../../../../../lib/api/stock.client', () => ({
  stockClient: {
    obtenerPaginado: vi.fn(),
  },
}));

vi.mock('../../../../../lib/api/cuenta-financiera.client', () => ({
  cuentaFinancieraClient: {
    obtenerTodas: vi.fn(),
  },
}));

vi.mock('../../../../../lib/api/proveedor.client', () => ({
  proveedorClient: {
    obtenerTodos: vi.fn(),
  },
}));

import { Sucursal } from '../../../../../lib/api/sucursal.client';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';

const mockSucursales: Sucursal[] = [
  { id: 'suc-1', nombre: 'Sucursal Centro', esCentral: true, valorDolar: 1000 },
  { id: 'suc-2', nombre: 'Sucursal Norte', esCentral: false, valorDolar: 1000 },
];

const mockCuentas: CuentaFinanciera[] = [
  {
    id: 'cta-1',
    nombre: 'Efectivo',
    porcentajeExtra: 0,
    saldoInicial: 0,
    saldoActual: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'cta-2',
    nombre: 'Tarjeta',
    porcentajeExtra: 10,
    saldoInicial: 0,
    saldoActual: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('Operaciones Forms - Valores por defecto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSucursales).mockReturnValue({
      sucursales: mockSucursales,
      sucursalOptions: [
        { value: '', label: 'Todas las sucursales' },
        { value: 'suc-1', label: 'Sucursal Centro' },
        { value: 'suc-2', label: 'Sucursal Norte' },
      ],
      isLoading: false,
      error: null,
      recargarSucursales: vi.fn(),
    });
    vi.mocked(stockClient.obtenerPaginado).mockResolvedValue({
      data: [],
      hasMore: false,
    });
    vi.mocked(cuentaFinancieraClient.obtenerTodas).mockResolvedValue(mockCuentas);
    vi.mocked(proveedorClient.obtenerTodos).mockResolvedValue([]);
  });

  describe('Sucursal por defecto', () => {
    it('selecciona la primera sucursal en VentaForm cuando hay varias', async () => {
      render(<VentaForm />);
      const selectSucursal = screen.getByLabelText('Sucursal') as HTMLSelectElement;
      expect(selectSucursal.value).toBe('suc-1');
    });

    it('selecciona la primera sucursal en CompraForm cuando hay varias', async () => {
      render(<CompraForm />);
      const selectSucursal = screen.getByLabelText('Sucursal') as HTMLSelectElement;
      expect(selectSucursal.value).toBe('suc-1');
    });

    it('selecciona la primera sucursal de origen en TrasladoForm cuando hay varias', async () => {
      render(<TrasladoForm />);
      const selectOrigen = screen.getByLabelText('Sucursal origen') as HTMLSelectElement;
      expect(selectOrigen.value).toBe('suc-1');
    });

    it('selecciona la primera sucursal en MovimientoForm cuando hay varias', async () => {
      render(<MovimientoForm />);
      const selectSucursal = screen.getByLabelText('Sucursal') as HTMLSelectElement;
      expect(selectSucursal.value).toBe('suc-1');
    });

    it('no falla y permanece vacío si no hay sucursales disponibles', async () => {
      vi.mocked(useSucursales).mockReturnValue({
        sucursales: [],
        sucursalOptions: [{ value: '', label: 'Todas las sucursales' }],
        isLoading: false,
        error: null,
        recargarSucursales: vi.fn(),
      });
      render(<VentaForm />);
      const selectSucursal = screen.getByLabelText('Sucursal') as HTMLSelectElement;
      expect(selectSucursal.value).toBe('');
    });
  });

  describe('Producto por defecto', () => {
    it('muestra una fila de producto lista para agregar en VentaForm', async () => {
      render(<VentaForm />);
      expect(await screen.findByPlaceholderText('Buscar producto...')).toBeInTheDocument();
      const inputCantidad = screen.getByLabelText('Cantidad de la fila 1') as HTMLInputElement;
      const inputImpacto = screen.getByLabelText('Cantidad a impactar del stock de la fila 1') as HTMLInputElement;
      expect(inputCantidad.value).toBe('1');
      expect(inputImpacto.value).toBe('1');
    });

    it('muestra una fila de producto lista para agregar en CompraForm', async () => {
      render(<CompraForm />);
      expect(await screen.findByPlaceholderText('Buscar producto...')).toBeInTheDocument();
      const inputCantidad = screen.getByLabelText('Cantidad de la fila 1') as HTMLInputElement;
      const inputImpacto = screen.getByLabelText('Cantidad a impactar del stock de la fila 1') as HTMLInputElement;
      expect(inputCantidad.value).toBe('1');
      expect(inputImpacto.value).toBe('1');
    });

    it('muestra una fila de producto lista para agregar en TrasladoForm', async () => {
      render(<TrasladoForm />);
      expect(await screen.findByPlaceholderText('Buscar producto...')).toBeInTheDocument();
    });
  });

  describe('Pago e impacto por defecto', () => {
    it('sincroniza el impacto inicial con la cantidad de una compra', () => {
      render(<CompraForm />);

      const cantidad = screen.getByLabelText('Cantidad de la fila 1');
      const impacto = screen.getByLabelText('Cantidad a impactar del stock de la fila 1');
      fireEvent.change(cantidad, { target: { value: '4' } });

      expect(impacto).toHaveValue(4);

      fireEvent.change(impacto, { target: { value: '0' } });
      expect(impacto).toHaveValue(0);
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it('no muestra los switches globales de pago ni stock en una compra', () => {
      render(<CompraForm />);

      expect(screen.getByRole('heading', { name: 'Pago' })).toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it('ofrece dejar pendiente el pago desde el bloque Pago', () => {
      const onModoChange = vi.fn();
      const onFilasChange = vi.fn();
      render(
        <PagoEditor
          mercaderia={1000}
          modo="unica"
          onModoChange={onModoChange}
          filas={[{ cuentaFinancieraId: 'cta-1' }]}
          onFilasChange={onFilasChange}
          habilitado={true}
          etiquetaPendiente="No pagar ahora"
          detallePendiente="La compra queda pendiente de pago."
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /no pagar ahora/i }));

      expect(onModoChange).toHaveBeenCalledWith('pendiente');
      expect(onFilasChange).toHaveBeenCalledWith([]);
    });

    it('activa "Una sola cuenta" por defecto pero sin cuenta seleccionada', async () => {
      render(
        <PagoEditor
          mercaderia={1000}
          modo="unica"
          onModoChange={vi.fn()}
          filas={[]}
          onFilasChange={vi.fn()}
          habilitado={true}
        />
      );

      const btnUnaSolaCuenta = screen.getByRole('button', { name: /una sola cuenta/i });
      expect(btnUnaSolaCuenta).toHaveAttribute('aria-pressed', 'true');

      const btnDividido = screen.getByRole('button', { name: /dividido/i });
      expect(btnDividido).toHaveAttribute('aria-pressed', 'false');

      // Las opciones de cuentas están visibles pero ninguna está seleccionada
      const btnEfectivo = await screen.findByRole('button', { name: /efectivo/i });
      expect(btnEfectivo).toHaveAttribute('aria-pressed', 'false');

      const btnTarjeta = screen.getByRole('button', { name: /tarjeta/i });
      expect(btnTarjeta).toHaveAttribute('aria-pressed', 'false');
    });

    it('muestra el precio total y debajo el valor de base + recargo en las tarjetas de cuentas', async () => {
      render(
        <PagoEditor
          mercaderia={1000}
          modo="unica"
          onModoChange={vi.fn()}
          filas={[{ cuentaFinancieraId: 'cta-2' }]}
          onFilasChange={vi.fn()}
          habilitado={true}
        />
      );

      // Tarjeta cuenta con recargo (cta-2: Tarjeta con 10%)
      const btnTarjeta = await screen.findByRole('button', { name: /tarjeta/i });
      expect(btnTarjeta).toHaveAttribute('aria-pressed', 'true');
      expect(btnTarjeta.textContent).toContain('Recargo 10%');
      expect(btnTarjeta.textContent).toContain('+');

      // Tarjeta cuenta sin recargo (cta-1: Efectivo con 0%)
      const btnEfectivo = screen.getByRole('button', { name: /efectivo/i });
      expect(btnEfectivo).toHaveAttribute('aria-pressed', 'false');
      expect(btnEfectivo.textContent).toContain('Sin recargo');
    });

    it('no renderiza botones de modo en PagoEditor cuando modo es "derivado"', () => {
      render(
        <PagoEditor
          mercaderia={0}
          modo="derivado"
          onModoChange={vi.fn()}
          filas={[{ cuentaFinancieraId: '' }]}
          onFilasChange={vi.fn()}
          habilitado={true}
        />
      );

      expect(screen.queryByRole('button', { name: /una sola cuenta/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /dividido/i })).not.toBeInTheDocument();
    });
  });
});
