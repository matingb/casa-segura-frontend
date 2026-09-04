export function formatFecha(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(monto);
}

export function formatARS(value: number): string {
  return formatMonto(value);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPorcentaje(valor: number): string {
  return `${valor.toFixed(2)}%`;
}

export function formatMedida(value: number | undefined | null, unidad: string): string {
  return value != null && Number(value) !== 0 ? `${Number(value).toFixed(2)} ${unidad}` : '—';
}

export function parseNum(raw: FormDataEntryValue | null, decimals = 2): number | null {
  if (!raw || raw === '') return null;
  const factor = Math.pow(10, decimals);
  return Math.round(Number(raw) * factor) / factor;
}
