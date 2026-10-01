/**
 * Cascada de descuentos y análisis centralizado de margen de ganancias (Frontend).
 * Espejo isomórfico de la lógica central del backend para cálculo instantáneo en cliente.
 */

export type NivelDescuento =
  | 'sucursal'
  | 'categoria'
  | 'producto'
  | 'region-cliente'
  | 'categoria-cliente'
  | 'producto-cliente'
  | 'cliente';

export type EstadoMargen =
  | 'optimo'
  | 'ajustado'
  | 'tope_aplicado'
  | 'perforado'
  | 'en_perdida'
  | 'sin_datos';

export interface AlertaMargen {
  tipo:
    | 'margen_saludable'
    | 'tope_aplicado'
    | 'margen_perforado'
    | 'margen_ajustado'
    | 'en_perdida'
    | 'sin_datos';
  severidad: 'info' | 'advertencia' | 'critica';
  mensaje: string;
}

export interface AnalisisMargen {
  costoReposicion: number | null;
  margenMinimo: number | null;
  precioMinimo: number | null;
  gananciaUnitaria: number | null;
  margenEfectivo: number | null;
  margenComercial: number | null;
  descuentoMaximo: number | null;
  topeAplicado: boolean;
  margenPerforado: boolean;
  estado: EstadoMargen;
  alertas: AlertaMargen[];
  descuentoEfectivoPorcentaje?: number | null;
}

export interface AporteNivel {
  nivel: NivelDescuento;
  nombre?: string;
  porcentaje: number;
  montoDescontado?: number;
  precioResultante: number;
}

export interface EntradaCascada {
  precioBase: number;
  descuentoSucursal?: number | null;
  descuentoCategoria?: number | null;
  descuentoProducto?: number | null;
  descuentoRegionCliente?: number | null;
  descuentoCategoriaCliente?: number | null;
  descuentoProductoCliente?: number | null;
  descuentoCliente?: number | null;
  precioManual?: number | null;
  costoReposicion?: number | null;
  margenMinimo?: number | null;
  permitirPerforacion?: boolean;
}

export interface ResultadoCascada {
  precioBase: number;
  precioFinal: number;
  precioSinTope: number;
  descuentoEfectivo: number;
  aportes: AporteNivel[];
  precioMinimo: number | null;
  topeAplicado: boolean;
  descuentoMaximo: number | null;
  analisisMargen: AnalisisMargen;
  alertas: AlertaMargen[];
  gananciaUnitaria: number | null;
  margenEfectivo: number | null;
}

export function normalizarPorcentaje(valor: number | null | undefined): number {
  if (valor === null || valor === undefined) return 0;
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 100);
}

export function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularPrecioMinimo(
  costoReposicion: number | null | undefined,
  margenMinimo: number | null | undefined
): number | null {
  if (costoReposicion === null || costoReposicion === undefined) return null;
  if (margenMinimo === null || margenMinimo === undefined) return null;
  const costo = Number(costoReposicion);
  const margen = Number(margenMinimo);
  if (!Number.isFinite(costo) || !Number.isFinite(margen) || costo <= 0) return null;
  return redondear(costo * (1 + margen / 100));
}

export function calcularDescuentoMaximo(
  precioBase: number,
  precioMinimo: number | null
): number | null {
  if (precioMinimo === null) return null;
  if (!Number.isFinite(precioBase) || precioBase <= 0) return null;
  if (precioMinimo >= precioBase) return 0;
  return redondear((1 - precioMinimo / precioBase) * 100);
}

export function evaluarMargenGanancia(params: {
  precioFinal: number;
  precioSinTope: number;
  costoReposicion?: number | null;
  margenMinimo?: number | null;
  precioMinimo: number | null;
  descuentoMaximo: number | null;
  topeAplicado: boolean;
}): AnalisisMargen {
  const {
    precioFinal,
    precioSinTope,
    costoReposicion,
    margenMinimo,
    precioMinimo,
    descuentoMaximo,
    topeAplicado,
  } = params;

  const alertas: AlertaMargen[] = [];

  const costo =
    costoReposicion != null && Number.isFinite(Number(costoReposicion)) && Number(costoReposicion) > 0
      ? Number(costoReposicion)
      : null;
  const margenConfigurado =
    margenMinimo != null && Number.isFinite(Number(margenMinimo))
      ? Number(margenMinimo)
      : null;

  if (costo === null || margenConfigurado === null || precioMinimo === null) {
    alertas.push({
      tipo: 'sin_datos',
      severidad: 'info',
      mensaje: 'Producto sin costo de reposición o margen mínimo configurados.',
    });
    return {
      costoReposicion: costo,
      margenMinimo: margenConfigurado,
      precioMinimo: null,
      gananciaUnitaria: costo !== null ? redondear(precioFinal - costo) : null,
      margenEfectivo: null,
      margenComercial: null,
      descuentoMaximo: null,
      topeAplicado: false,
      margenPerforado: false,
      estado: 'sin_datos',
      alertas,
    };
  }

  const gananciaUnitaria = redondear(precioFinal - costo);
  const margenEfectivo = redondear((gananciaUnitaria / costo) * 100);
  const margenComercial = precioFinal > 0 ? redondear((gananciaUnitaria / precioFinal) * 100) : 0;
  const margenPerforado = precioFinal < precioMinimo - 0.01;

  let estado: EstadoMargen = 'optimo';

  if (precioFinal < costo) {
    estado = 'en_perdida';
    alertas.push({
      tipo: 'en_perdida',
      severidad: 'critica',
      mensaje: `¡Alerta de pérdida! El precio ($${precioFinal.toFixed(2)}) es inferior al costo ($${costo.toFixed(2)}). Pérdida de $${Math.abs(gananciaUnitaria).toFixed(2)} por unidad.`,
    });
  } else if (margenPerforado) {
    estado = 'perforado';
    alertas.push({
      tipo: 'margen_perforado',
      severidad: 'critica',
      mensaje: `Margen mínimo perforado: el precio de $${precioFinal.toFixed(2)} deja un margen del ${margenEfectivo}%, por debajo del ${margenConfigurado}% exigido (piso: $${precioMinimo.toFixed(2)}).`,
    });
  } else if (topeAplicado) {
    estado = 'tope_aplicado';
    alertas.push({
      tipo: 'tope_aplicado',
      severidad: 'advertencia',
      mensaje: `Tope de protección aplicado: la cascada de descuentos calculaba $${precioSinTope.toFixed(2)}, pero se ajustó al piso de $${precioMinimo.toFixed(2)} para proteger el margen mínimo del ${margenConfigurado}%.`,
    });
  } else if (margenEfectivo < margenConfigurado + 5) {
    estado = 'ajustado';
    alertas.push({
      tipo: 'margen_ajustado',
      severidad: 'advertencia',
      mensaje: `Margen ajustado: rentabilidad del ${margenEfectivo}% (muy cercana al mínimo del ${margenConfigurado}%). Ganancia unitaria: $${gananciaUnitaria.toFixed(2)}.`,
    });
  } else {
    estado = 'optimo';
    alertas.push({
      tipo: 'margen_saludable',
      severidad: 'info',
      mensaje: `Rentabilidad saludable: ganancia de $${gananciaUnitaria.toFixed(2)} por unidad (${margenEfectivo}% sobre costo).`,
    });
  }

  return {
    costoReposicion: costo,
    margenMinimo: margenConfigurado,
    precioMinimo,
    gananciaUnitaria,
    margenEfectivo,
    margenComercial,
    descuentoMaximo,
    topeAplicado,
    margenPerforado,
    estado,
    alertas,
  };
}

export function calcularCascada(entrada: EntradaCascada): ResultadoCascada {
  const precioBase = Number(entrada.precioBase);
  const aportes: AporteNivel[] = [];

  const precioMinimo = calcularPrecioMinimo(entrada.costoReposicion, entrada.margenMinimo);
  const descuentoMaximo = calcularDescuentoMaximo(precioBase, precioMinimo);

  if (!Number.isFinite(precioBase) || precioBase <= 0) {
    const analisisVacio = evaluarMargenGanancia({
      precioFinal: 0,
      precioSinTope: 0,
      costoReposicion: entrada.costoReposicion,
      margenMinimo: entrada.margenMinimo,
      precioMinimo: null,
      descuentoMaximo: null,
      topeAplicado: false,
    });
    return {
      precioBase: 0,
      precioFinal: 0,
      precioSinTope: 0,
      descuentoEfectivo: 0,
      aportes,
      precioMinimo: null,
      topeAplicado: false,
      descuentoMaximo: null,
      analisisMargen: analisisVacio,
      alertas: analisisVacio.alertas,
      gananciaUnitaria: null,
      margenEfectivo: null,
    };
  }

  if (entrada.precioManual !== undefined && entrada.precioManual !== null && Number.isFinite(Number(entrada.precioManual))) {
    const precioManual = redondear(Number(entrada.precioManual));
    const descuentoEfectivoManual = redondear(((precioBase - precioManual) / precioBase) * 100);

    const analisis = evaluarMargenGanancia({
      precioFinal: precioManual,
      precioSinTope: precioManual,
      costoReposicion: entrada.costoReposicion,
      margenMinimo: entrada.margenMinimo,
      precioMinimo,
      descuentoMaximo,
      topeAplicado: false,
    });

    return {
      precioBase: redondear(precioBase),
      precioFinal: precioManual,
      precioSinTope: precioManual,
      descuentoEfectivo: descuentoEfectivoManual,
      aportes: [],
      precioMinimo,
      topeAplicado: false,
      descuentoMaximo,
      analisisMargen: analisis,
      alertas: analisis.alertas,
      gananciaUnitaria: analisis.gananciaUnitaria,
      margenEfectivo: analisis.margenEfectivo,
    };
  }

  let precio = precioBase;
  const enCascada: [NivelDescuento, number][] = [
    ['sucursal', normalizarPorcentaje(entrada.descuentoSucursal)],
    ['categoria', normalizarPorcentaje(entrada.descuentoCategoria)],
    ['producto', normalizarPorcentaje(entrada.descuentoProducto)],
    ['region-cliente', normalizarPorcentaje(entrada.descuentoRegionCliente)],
    ['categoria-cliente', normalizarPorcentaje(entrada.descuentoCategoriaCliente)],
    ['producto-cliente', normalizarPorcentaje(entrada.descuentoProductoCliente)],
  ];

  for (const [nivel, porcentaje] of enCascada) {
    if (porcentaje === 0) continue;
    const precioAnterior = precio;
    precio = precio * (1 - porcentaje / 100);
    const montoDescontado = redondear(precioAnterior - precio);
    aportes.push({
      nivel,
      porcentaje,
      montoDescontado,
      precioResultante: redondear(precio),
    });
  }

  const descuentoCliente = normalizarPorcentaje(entrada.descuentoCliente);
  if (descuentoCliente > 0) {
    const precioAnterior = precio;
    const efectivoCascada = (1 - precio / precioBase) * 100;
    const efectivoTotal = Math.min(efectivoCascada + descuentoCliente, 100);
    precio = precioBase * (1 - efectivoTotal / 100);
    const montoDescontado = redondear(precioAnterior - precio);
    aportes.push({
      nivel: 'cliente',
      porcentaje: descuentoCliente,
      montoDescontado,
      precioResultante: redondear(precio),
    });
  }

  const precioSinTope = redondear(precio);

  let precioFinal = precioSinTope;
  let topeAplicado = false;
  if (precioMinimo !== null && precioSinTope < precioMinimo) {
    if (!entrada.permitirPerforacion) {
      precioFinal = precioMinimo;
      topeAplicado = true;
    }
  }

  const descuentoEfectivo = redondear((1 - precioFinal / precioBase) * 100);

  const analisisMargen = evaluarMargenGanancia({
    precioFinal,
    precioSinTope,
    costoReposicion: entrada.costoReposicion,
    margenMinimo: entrada.margenMinimo,
    precioMinimo,
    descuentoMaximo,
    topeAplicado,
  });
  analisisMargen.descuentoEfectivoPorcentaje = descuentoEfectivo;

  return {
    precioBase: redondear(precioBase),
    precioFinal,
    precioSinTope,
    descuentoEfectivo,
    aportes,
    precioMinimo,
    topeAplicado,
    descuentoMaximo,
    analisisMargen,
    alertas: analisisMargen.alertas,
    gananciaUnitaria: analisisMargen.gananciaUnitaria,
    margenEfectivo: analisisMargen.margenEfectivo,
  };
}
