export class CatalogoApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
    this.name = 'CatalogoApiError';
  }
}

export async function errorCatalogo(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new CatalogoApiError(
    typeof body.message === 'string' ? body.message : fallback,
    typeof body.code === 'string' ? body.code : undefined,
    res.status
  );
}

export async function respuestaApi<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status !== 'success') {
    throw new CatalogoApiError(
      typeof body.message === 'string' ? body.message : fallback,
      typeof body.code === 'string' ? body.code : undefined,
      res.status
    );
  }
  return body.data as T;
}
