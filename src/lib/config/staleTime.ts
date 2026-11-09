export const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutos (300.000 ms)

/**
 * Obtiene el tiempo de revalidación por foco (stale time) global en milisegundos.
 * Se puede configurar mediante la variable de entorno NEXT_PUBLIC_STALE_TIME_MS.
 * Si no está configurada o es inválida, se utiliza el valor por defecto de 5 minutos (300.000 ms).
 */
export function getGlobalStaleTimeMs(): number {
  const envVal = process.env.NEXT_PUBLIC_STALE_TIME_MS;
  if (!envVal) return DEFAULT_STALE_TIME_MS;
  const parsed = Number(envVal);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_TIME_MS;
}

