import { describe, expect, it } from 'vitest';
import { ItemConMargenCalculado } from '../../../../../lib/types/ListaPreciosCliente';
import { origenDescuentos, simularPrecio } from './simularPrecio';

const item = (aportes: ItemConMargenCalculado['descuentosAportes'], extra: Partial<ItemConMargenCalculado> = {}) => ({
  id: '1', productoId: 'p', codigo: 'PROD-1', nombre: 'Cámara', subtipoNombre: '', precioListaArs: '100.00',
  descuentoTotalPorcentaje: 0, precioFinalArs: '100.00', precioFinalUsd: null, descuentosDetalle: [],
  descuentosAportes: aportes, precioSinTope: null, precioMinimo: null, costoReposicion: null, margenMinimo: null,
  noAlcanzaMargen: false, ...extra,
}) as ItemConMargenCalculado;

describe('simularPrecio', () => {
  it('encadena los descuentos: 10% + 5% es 14,5%', () => {
    const r = simularPrecio(item([{ nivel: 'region-cliente', porcentaje: 10 }]), { 'categoria-cliente': 5 });
    expect(r.descuentoTotal).toBe(14.5);
    expect(r.precioFinal).toBe(85.5);
  });
  it('reemplaza el nivel editado y conserva los demás', () => {
    const base = item([{ nivel: 'region-cliente', porcentaje: 10 }, { nivel: 'producto-cliente', porcentaje: 50 }]);
    expect(simularPrecio(base, { 'producto-cliente': null }).precioFinal).toBe(90);
    expect(simularPrecio(base, { 'producto-cliente': 20 }).precioFinal).toBe(72);
  });
  it('el habitual se suma al final y avisa si perfora el margen', () => {
    expect(simularPrecio(item([{ nivel: 'region-cliente', porcentaje: 10 }, { nivel: 'cliente', porcentaje: 5 }])).descuentoTotal).toBe(15);
    const conPiso = item([], { costoReposicion: '80', margenMinimo: '10' });
    expect(simularPrecio(conPiso, { 'producto-cliente': 30 })).toMatchObject({ precioFinal: 88, debajoDelMargen: true });
  });
  it('describe de dónde salen los otros descuentos', () => {
    const base = item([{ nivel: 'region-cliente', porcentaje: 10 }, { nivel: 'categoria-cliente', porcentaje: 5 }, { nivel: 'producto-cliente', porcentaje: 1 }]);
    expect(origenDescuentos(base, 'producto-cliente')).toBe('región y categoría');
  });
});
