export function esEgresoMovimiento(tipo?: string): boolean {
  const tipoNormalizado = tipo?.trim().toLowerCase();
  return tipoNormalizado === 'egreso' || tipoNormalizado === 'compra' || tipoNormalizado === 'traslado';
}

export function montoConSignoMovimiento(monto: number, tipo?: string): number {
  const montoAbsoluto = Math.abs(monto);
  return esEgresoMovimiento(tipo) ? -montoAbsoluto : montoAbsoluto;
}
