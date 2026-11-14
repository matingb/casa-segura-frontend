import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Tooltip from './Tooltip';
import TooltipDescuento from './TooltipDescuento';
import { AporteDescuentoLista } from '../../../lib/types/ListaPreciosCliente';
import { nombreNivel, ordenarAportes, porcentajesDescuento } from '../../../lib/utils/niveles-descuento';

describe('Tooltip', () => {
  it('renderiza el trigger sin mostrar el contenido inicialmente', () => {
    render(
      <Tooltip content="Contenido secreto">
        <button>Trigger</button>
      </Tooltip>
    );

    expect(screen.getByText('Trigger')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('se muestra al pasar el mouse y se oculta al salir (API contenido)', () => {
    render(<Tooltip contenido="Región 2%"><span>2%</span></Tooltip>);
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.mouseEnter(screen.getByText('2%'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Región 2%');

    fireEvent.mouseLeave(screen.getByText('2%'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('se muestra al pasar el mouse y se oculta al salir (API content)', () => {
    render(
      <Tooltip content="Información detallada">
        <span>Hover me</span>
      </Tooltip>
    );

    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Información detallada')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('se abre con el teclado, describe al disparador y se cierra con Escape', () => {
    render(<Tooltip contenido="Detalle"><span>3%</span></Tooltip>);
    const disparador = screen.getByText('3%').parentElement!;

    fireEvent.focus(disparador);
    const tooltip = screen.getByRole('tooltip');
    expect(disparador).toHaveAttribute('aria-describedby', tooltip.id);

    fireEvent.keyDown(disparador, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('muestra el contenido al recibir foco y lo oculta al perderlo', () => {
    render(
      <Tooltip content="Foco activo">
        <button>Focus me</button>
      </Tooltip>
    );

    const trigger = screen.getByText('Focus me');
    fireEvent.focus(trigger);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Foco activo')).toBeInTheDocument();

    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('no muestra el tooltip si desactivado es true', () => {
    render(
      <Tooltip content="No me verás" desactivado>
        <span>Desactivado</span>
      </Tooltip>
    );

    const trigger = screen.getByText('Desactivado');
    fireEvent.mouseEnter(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('se cierra al hacer scroll', () => {
    render(<Tooltip contenido="Detalle"><span>3%</span></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('3%'));
    fireEvent.scroll(window);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});

describe('Porcentajes de descuento', () => {
  it('se muestran en orden producto, categoría, PDV y región', () => {
    const ordenados = ordenarAportes([
      { nivel: 'region-cliente', porcentaje: 2 },
      { nivel: 'sucursal', porcentaje: 5 },
      { nivel: 'categoria', porcentaje: 3 },
      { nivel: 'producto', porcentaje: 1 },
    ]);
    expect(ordenados.map(a => a.nivel)).toEqual(['producto', 'categoria', 'sucursal', 'region-cliente']);
    expect(porcentajesDescuento(ordenados)).toBe('1% / 3% / 5% / 2%');
  });

  it('reconoce el nombre de cada nivel de descuento', () => {
    expect(nombreNivel('region-cliente')).toBe('Región');
    expect(nombreNivel('sucursal')).toBe('Sucursal');
    expect(nombreNivel('categoria')).toBe('Categoría general');
  });
});

describe('TooltipDescuento', () => {
  it('renderiza "0%" plano si no hay descuento', () => {
    render(<TooltipDescuento aportes={[]} descuentoTotal={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renderiza cadena de descuentos con formato "10% / 15% / 6%"', () => {
    const aportes: AporteDescuentoLista[] = [
      { nivel: 'sucursal', porcentaje: 10 },
      { nivel: 'categoria', porcentaje: 15 },
      { nivel: 'producto', porcentaje: 6 },
    ];
    render(<TooltipDescuento aportes={aportes} descuentoTotal={28.2} />);
    expect(screen.getByText('10% / 15% / 6%')).toBeInTheDocument();
  });

  it('muestra el detalle y total efectivo en el tooltip al hacer hover', () => {
    const aportes: AporteDescuentoLista[] = [
      { nivel: 'sucursal', porcentaje: 10 },
      { nivel: 'categoria', porcentaje: 15 },
    ];
    render(<TooltipDescuento aportes={aportes} descuentoTotal={23.5} />);

    const trigger = screen.getByText('10% / 15%');
    fireEvent.mouseEnter(trigger);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Descuentos aplicados')).toBeInTheDocument();
    expect(screen.getByText('Sucursal:')).toBeInTheDocument();
    expect(screen.getByText('Categoría:')).toBeInTheDocument();
    expect(screen.getByText('Total efectivo:')).toBeInTheDocument();
    expect(screen.getByText('23,5%')).toBeInTheDocument();
  });

  it('no muestra fila de total efectivo si hay solo un descuento', () => {
    const aportes: AporteDescuentoLista[] = [
      { nivel: 'sucursal', porcentaje: 10 },
    ];
    render(<TooltipDescuento aportes={aportes} descuentoTotal={10} />);

    const trigger = screen.getByText('10%');
    fireEvent.mouseEnter(trigger);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Sucursal:')).toBeInTheDocument();
    expect(screen.queryByText('Total efectivo:')).not.toBeInTheDocument();
  });
});
