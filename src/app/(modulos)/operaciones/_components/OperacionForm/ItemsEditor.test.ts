import { describe, it, expect } from 'vitest';
import { importeItem, excedeStock } from './ItemsEditor';

describe('importeItem', () => {
  it('usa el costo unitario en compras y el precio en ventas', () => {
    const item = { productoSucursalId: 'p1', cantidad: 3, costoUnitArs: 100, precioUnitArs: 150 };
    expect(importeItem(item, 'compra')).toBe(300);
    expect(importeItem(item, 'venta')).toBe(450);
  });

  it('devuelve 0 si falta el unitario', () => {
    expect(importeItem({ productoSucursalId: 'p1', cantidad: 3 }, 'compra')).toBe(0);
  });

  it('devuelve 0 si la cantidad está vacía', () => {
    expect(importeItem({ productoSucursalId: 'p1', cantidad: 0, costoUnitArs: 100 }, 'compra')).toBe(0);
  });
});

describe('excedeStock', () => {
  const stockItem = { cantidadDisponible: 19 } as never;

  it('no avisa cuando la cantidad entra en el stock', () => {
    expect(excedeStock({ productoSucursalId: 'p1', cantidad: 19 }, stockItem)).toBe(0);
    expect(excedeStock({ productoSucursalId: 'p1', cantidad: 5 }, stockItem)).toBe(0);
  });

  it('devuelve cuántas unidades faltan cuando se pasa', () => {
    expect(excedeStock({ productoSucursalId: 'p1', cantidad: 25 }, stockItem)).toBe(6);
  });

  it('no avisa si todavía no se eligió producto', () => {
    expect(excedeStock({ productoSucursalId: '', cantidad: 100 }, undefined)).toBe(0);
  });

  it('trata un stock en cero como sin disponibilidad', () => {
    const sinStock = { cantidadDisponible: 0 } as never;
    expect(excedeStock({ productoSucursalId: 'p1', cantidad: 1 }, sinStock)).toBe(1);
  });

  it('no avisa con la cantidad vacía', () => {
    expect(excedeStock({ productoSucursalId: 'p1', cantidad: 0 }, stockItem)).toBe(0);
  });
});
