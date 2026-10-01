import { describe, it, expect } from 'vitest';
import { calcularCascada } from '../../../../../lib/utils/cascada-descuentos';
import {
  evaluarAlcanzaMargen,
  validarMargenListaPrecios,
  ItemConMargenCalculado,
} from './validarMargenListaPrecios';

describe('Cascada de descuentos y margen de utilidad', () => {
  const PRECIO_BASE = 10000;
  const COSTO = 5000;
  const MARGEN_MINIMO = 20; // Piso: 5000 * 1.20 = 6000 (Descuento máximo: 40%)

  describe('1. Producto sin descuento', () => {
    it('mantiene el precio base de lista intacto (0% descuento efectivo)', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
      });

      expect(res.precioBase).toBe(10000);
      expect(res.precioFinal).toBe(10000);
      expect(res.descuentoEfectivo).toBe(0);
      expect(res.aportes).toHaveLength(0);
      expect(res.topeAplicado).toBe(false);
    });
  });

  describe('2. Producto con descuento de región', () => {
    it('aplica únicamente el descuento de región asignado al cliente', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoRegionCliente: 15,
      });

      // 10000 - 15% = 8500
      expect(res.precioFinal).toBe(8500);
      expect(res.descuentoEfectivo).toBe(15);
      expect(res.aportes).toEqual([
        {
          nivel: 'region-cliente',
          porcentaje: 15,
          montoDescontado: 1500,
          precioResultante: 8500,
        },
      ]);
    });
  });

  describe('3. Producto con cada uno de los descuentos de forma individual', () => {
    it('solo descuento de sucursal', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoSucursal: 10,
      });
      expect(res.precioFinal).toBe(9000);
      expect(res.descuentoEfectivo).toBe(10);
      expect(res.aportes).toHaveLength(1);
      expect(res.aportes[0].nivel).toBe('sucursal');
    });

    it('solo descuento de categoría general', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoCategoria: 12,
      });
      expect(res.precioFinal).toBe(8800);
      expect(res.descuentoEfectivo).toBe(12);
      expect(res.aportes).toHaveLength(1);
      expect(res.aportes[0].nivel).toBe('categoria');
    });

    it('solo descuento de producto en sucursal', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoProducto: 8,
      });
      expect(res.precioFinal).toBe(9200);
      expect(res.descuentoEfectivo).toBe(8);
      expect(res.aportes).toHaveLength(1);
      expect(res.aportes[0].nivel).toBe('producto');
    });

    it('solo descuento de región cliente', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoRegionCliente: 7,
      });
      expect(res.precioFinal).toBe(9300);
      expect(res.descuentoEfectivo).toBe(7);
      expect(res.aportes).toHaveLength(1);
      expect(res.aportes[0].nivel).toBe('region-cliente');
    });

    it('solo descuento de categoría asignada al cliente', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoCategoriaCliente: 20,
      });
      expect(res.precioFinal).toBe(8000);
      expect(res.descuentoEfectivo).toBe(20);
      expect(res.aportes).toHaveLength(1);
      expect(res.aportes[0].nivel).toBe('categoria-cliente');
    });

    it('solo descuento de producto asignado al cliente', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoProductoCliente: 25,
      });
      expect(res.precioFinal).toBe(7500);
      expect(res.descuentoEfectivo).toBe(25);
      expect(res.aportes).toHaveLength(1);
      expect(res.aportes[0].nivel).toBe('producto-cliente');
    });

    it('solo descuento habitual general del cliente', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoCliente: 10,
      });
      expect(res.precioFinal).toBe(9000);
      expect(res.descuentoEfectivo).toBe(10);
      expect(res.aportes).toHaveLength(1);
      expect(res.aportes[0].nivel).toBe('cliente');
    });
  });

  describe('4. Combinatoria de descuentos en cadena', () => {
    it('combinatoria 2 niveles (Región Cliente + Categoría Cliente)', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoRegionCliente: 10,
        descuentoCategoriaCliente: 10,
      });
      // 10000 - 10% = 9000; 9000 - 10% = 8100
      expect(res.precioFinal).toBe(8100);
      expect(res.descuentoEfectivo).toBe(19);
      expect(res.aportes.map((a) => a.nivel)).toEqual([
        'region-cliente',
        'categoria-cliente',
      ]);
    });

    it('combinatoria 3 niveles del cliente (Región + Categoría + Producto)', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoRegionCliente: 10,
        descuentoCategoriaCliente: 10,
        descuentoProductoCliente: 10,
      });
      // 10000 -> 9000 -> 8100 -> 7290 (27.1% compuesto)
      expect(res.precioFinal).toBe(7290);
      expect(res.descuentoEfectivo).toBe(27.1);
      expect(res.aportes.map((a) => a.precioResultante)).toEqual([9000, 8100, 7290]);
    });

    it('combinatoria completa de todos los niveles en cadena', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoSucursal: 5,
        descuentoCategoria: 5,
        descuentoProducto: 5,
        descuentoRegionCliente: 5,
        descuentoCategoriaCliente: 5,
        descuentoProductoCliente: 5,
        descuentoCliente: 5, // Habitual: se suma al efectivo
      });

      // Cascada de 6 niveles al 5%: 10000 * (0.95)^6 = 7350.92 (26.49% efectivo en cascada)
      // + 5% habitual del cliente = 31.49% total
      // 10000 * (1 - 0.3149) = 6851
      expect(res.descuentoEfectivo).toBe(31.49);
      expect(res.precioFinal).toBe(6850.92);
      expect(res.aportes).toHaveLength(7);
    });
  });

  describe('5. Margen de utilidad y detección de pisos', () => {
    it('permite margen saludable cuando el precio final supera el piso holgadamente', () => {
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoRegionCliente: 10, // 9000
        costoReposicion: COSTO,     // 5000
        margenMinimo: MARGEN_MINIMO,// 20% => piso = 6000
      });

      const evaluacion = evaluarAlcanzaMargen({
        precioSinTope: res.precioSinTope,
        costoReposicion: COSTO,
        margenMinimo: MARGEN_MINIMO,
        precioMinimo: res.precioMinimo,
      });

      expect(res.precioFinal).toBe(9000);
      expect(evaluacion.noAlcanzaMargen).toBe(false);
      expect(res.analisisMargen.estado).toBe('optimo');
      expect(res.gananciaUnitaria).toBe(4000);
    });

    it('detecta cuando los descuentos aplicados no permiten llegar al margen mínimo', () => {
      // Base: 10000. Descuentos: 30% región + 20% categoría = 10000 * 0.7 * 0.8 = 5600.
      // Piso requerido: Costo 5000 + 20% margen = 6000.
      // 5600 < 6000 => No permite llegar al margen.
      const res = calcularCascada({
        precioBase: PRECIO_BASE,
        descuentoRegionCliente: 30,
        descuentoCategoriaCliente: 20,
        costoReposicion: COSTO,
        margenMinimo: MARGEN_MINIMO,
      });

      expect(res.precioSinTope).toBe(5600);
      expect(res.precioMinimo).toBe(6000);

      const evaluacion = evaluarAlcanzaMargen({
        precioSinTope: res.precioSinTope,
        costoReposicion: COSTO,
        margenMinimo: MARGEN_MINIMO,
        precioMinimo: res.precioMinimo,
      });

      expect(evaluacion.noAlcanzaMargen).toBe(true);
      expect(evaluacion.motivo).toContain('inferior al mínimo exigido');
    });

    it('detecta venta en pérdida si el precio queda por debajo del costo', () => {
      const evaluacion = evaluarAlcanzaMargen({
        precioSinTope: 4500, // Menor al costo de 5000
        costoReposicion: 5000,
        margenMinimo: 20,
        precioMinimo: 6000,
      });

      expect(evaluacion.noAlcanzaMargen).toBe(true);
      expect(evaluacion.motivo).toContain('inferior al costo');
    });
  });

  describe('6. Bloqueo de generación de lista de precios ante margen insuficiente', () => {
    const itemValido: ItemConMargenCalculado = {
      id: 'item-1',
      productoId: 'prod-1',
      codigo: 'CAM-01',
      nombre: 'Cámara Domo IP',
      subtipoNombre: 'Cámaras',
      precioListaArs: 10000,
      descuentoTotalPorcentaje: 10,
      precioFinalArs: 9000,
      precioSinTope: 9000,
      precioFinalUsd: null,
      descuentosDetalle: ['Región: -10%'],
      costoReposicion: 5000,
      margenMinimo: 20, // piso: 6000. 9000 > 6000 => OK
      precioMinimo: 6000,
      noAlcanzaMargen: false,
    };

    const itemBajoMargen: ItemConMargenCalculado = {
      id: 'item-2',
      productoId: 'prod-2',
      codigo: 'DVR-08',
      nombre: 'Grabador DVR 8 Canales',
      subtipoNombre: 'Grabadores',
      precioListaArs: 10000,
      descuentoTotalPorcentaje: 45, // Descuento excesivo
      precioFinalArs: 6000,
      precioSinTope: 5500, // 5500 < piso de 6000
      precioFinalUsd: null,
      descuentosDetalle: ['Región: -20%', 'Cat: -20%', 'Habitual: -5%'],
      costoReposicion: 5000,
      margenMinimo: 20, // piso: 6000
      precioMinimo: 6000,
      noAlcanzaMargen: true,
      motivoMargen: 'Margen efectivo inferior al mínimo exigido (20%)',
    };

    it('permite generar la lista de precios si todos los productos cumplen con el margen', () => {
      const items = [itemValido];
      const validacion = validarMargenListaPrecios(items);

      expect(validacion.puedeGenerar).toBe(true);
      expect(validacion.productosBajoMargen).toHaveLength(0);
      expect(validacion.mensajeError).toBeUndefined();
    });

    it('bloquea la generación de la lista de precios si al menos un producto no llega al margen', () => {
      const items = [itemValido, itemBajoMargen];
      const validacion = validarMargenListaPrecios(items);

      expect(validacion.puedeGenerar).toBe(false);
      expect(validacion.productosBajoMargen).toHaveLength(1);
      expect(validacion.productosBajoMargen[0].codigo).toBe('DVR-08');
      expect(validacion.mensajeError).toContain('No se puede generar la lista de precios');
      expect(validacion.mensajeError).toContain('1 producto(s)');
    });

    it('bloquea e identifica múltiples productos con margen perforado', () => {
      const segundoItemBajoMargen: ItemConMargenCalculado = {
        ...itemBajoMargen,
        id: 'item-3',
        codigo: 'ALM-01',
        nombre: 'Sensor de Movimiento',
        noAlcanzaMargen: true,
      };

      const items = [itemValido, itemBajoMargen, segundoItemBajoMargen];
      const validacion = validarMargenListaPrecios(items);

      expect(validacion.puedeGenerar).toBe(false);
      expect(validacion.productosBajoMargen).toHaveLength(2);
      expect(validacion.mensajeError).toContain('2 producto(s)');
    });
  });
});
