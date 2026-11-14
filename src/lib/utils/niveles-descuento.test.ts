import { describe, expect, it } from 'vitest';
import { formatoDescuentosCadena, detalleLargo, detalleCorto } from './niveles-descuento';
import { AporteDescuentoLista } from '../types/ListaPreciosCliente';

describe('niveles-descuento', () => {
  describe('formatoDescuentosCadena', () => {
    it('muestra "0%" cuando no hay descuentos', () => {
      expect(formatoDescuentosCadena([])).toBe('0%');
      expect(formatoDescuentosCadena([], 0)).toBe('0%');
    });

    it('formatea un descuento individual con porcentaje', () => {
      const aportes: AporteDescuentoLista[] = [{ nivel: 'sucursal', porcentaje: 10 }];
      expect(formatoDescuentosCadena(aportes)).toBe('10%');
    });

    it('formatea múltiples descuentos concatenados con " / "', () => {
      const aportes: AporteDescuentoLista[] = [
        { nivel: 'sucursal', porcentaje: 10 },
        { nivel: 'categoria', porcentaje: 15 },
        { nivel: 'producto', porcentaje: 6 },
      ];
      expect(formatoDescuentosCadena(aportes)).toBe('10% / 15% / 6%');
    });

    it('ignora aportes con porcentaje 0 o menor', () => {
      const aportes: AporteDescuentoLista[] = [
        { nivel: 'sucursal', porcentaje: 10 },
        { nivel: 'categoria', porcentaje: 0 },
        { nivel: 'producto', porcentaje: 5 },
      ];
      expect(formatoDescuentosCadena(aportes)).toBe('10% / 5%');
    });

    it('usa el descuento total como fallback si no hay aportes pero sí total', () => {
      expect(formatoDescuentosCadena([], 12.5)).toBe('12,5%');
    });
  });

  describe('detalleLargo (tooltip)', () => {
    it('muestra mensaje por defecto si no hay descuentos', () => {
      expect(detalleLargo([])).toBe('Sin descuentos: se usa el precio de lista.');
    });

    it('muestra el nombre y porcentaje de un nivel', () => {
      const aportes: AporteDescuentoLista[] = [{ nivel: 'sucursal', porcentaje: 10 }];
      expect(detalleLargo(aportes)).toBe('Sucursal: 10%');
    });

    it('muestra la descripción de cada descuento en líneas separadas', () => {
      const aportes: AporteDescuentoLista[] = [
        { nivel: 'sucursal', porcentaje: 10 },
        { nivel: 'categoria', porcentaje: 15 },
        { nivel: 'producto', porcentaje: 6 },
      ];
      expect(detalleLargo(aportes)).toBe('Sucursal: 10%\nCategoría: 15%\nProducto: 6%');
    });

    it('funciona con niveles de cliente', () => {
      const aportes: AporteDescuentoLista[] = [
        { nivel: 'sucursal', porcentaje: 10 },
        { nivel: 'region-cliente', porcentaje: 5 },
        { nivel: 'cliente', porcentaje: 3 },
      ];
      expect(detalleLargo(aportes)).toBe('Sucursal: 10%\nRegión: 5%\nCliente: 3%');
    });

    it('muestra fallback con descuento total si no hay aportes específicos', () => {
      expect(detalleLargo([], 15)).toBe('Descuento: 15%');
    });
  });

  describe('detalleCorto', () => {
    it('devuelve los aportes separados por punto medio', () => {
      const aportes: AporteDescuentoLista[] = [
        { nivel: 'sucursal', porcentaje: 10 },
        { nivel: 'categoria', porcentaje: 15 },
      ];
      expect(detalleCorto(aportes)).toBe('Sucursal 10% · Categoría 15%');
    });
  });
});
