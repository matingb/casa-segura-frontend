/**
 * Wrapper centralizado de fetch para la API.
 * - Intercepta 401, intenta renovar sesión vía POST /api/auth/refresh y reintenta la petición.
 * - Si el refresco falla o ya es un endpoint de autenticación, redirige a /login.
 * - Maneja concurrencia para evitar múltiples llamadas simultáneas de refresh.
 */

let refreshPromise: Promise<boolean> | null = null;

async function refreshAuthToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isAuthRoute(input: RequestInfo): boolean {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (typeof URL !== 'undefined' && input instanceof URL) {
    url = input.toString();
  } else if (typeof Request !== 'undefined' && input instanceof Request) {
    url = input.url;
  }
  return url.includes('/api/auth/login') || url.includes('/api/auth/refresh');
}

export async function apiFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, { credentials: 'include', ...init });

  if (res.status === 403 && typeof window !== 'undefined') {
    void res.clone().json().then((body: unknown) => {
      if (typeof body === 'object' && body !== null && 'code' in body && body.code === 'SUCURSAL_FUERA_DE_ALCANCE') {
        window.dispatchEvent(new CustomEvent('alcance-pdv-revocado', { detail: body }));
      }
    }).catch(() => undefined);
  }

  if (res.status === 401) {
    if (!isAuthRoute(input)) {
      const refreshed = await refreshAuthToken();
      if (refreshed) {
        const retryRes = await fetch(input, { credentials: 'include', ...init });
        if (retryRes.status !== 401) {
          return retryRes;
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    throw new Error('Sesión expirada. Redirigiendo al login...');
  }

  return res;
}
