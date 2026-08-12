/**
 * Wrapper centralizado de fetch para la API.
 * - Redirige automáticamente a /login ante un 401.
 * - Lanza error descriptivo ante cualquier otra respuesta no-ok.
 */
export async function apiFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, { credentials: 'include', ...init });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    throw new Error('Sesión expirada. Redirigiendo al login...');
  }

  return res;
}
