import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from './apiFetch';

describe('apiFetch', () => {
  const originalLocation = window.location;
  let replaceMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        replace: replaceMock,
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('retorna la respuesta directamente cuando el status es 200', async () => {
    const mockResponse = new Response(JSON.stringify({ data: 'ok' }), { status: 200 });
    vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const res = await apiFetch('/api/productos');

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('si recibe 401, renueva el token mediante /api/auth/refresh y reintenta la petición exitosamente', async () => {
    const mock401 = new Response(null, { status: 401 });
    const mockRefreshOk = new Response(JSON.stringify({ status: 'success' }), { status: 200 });
    const mockRetryOk = new Response(JSON.stringify({ data: 'productos' }), { status: 200 });

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(mock401) // 1era llamada a /api/productos
      .mockResolvedValueOnce(mockRefreshOk) // llamada a /api/auth/refresh
      .mockResolvedValueOnce(mockRetryOk); // reintento a /api/productos

    const res = await apiFetch('/api/productos');

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      '/api/productos',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      '/api/productos',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('si el refresh falla, redirige a /login y lanza error', async () => {
    const mock401 = new Response(null, { status: 401 });
    const mockRefreshFailed = new Response(null, { status: 401 });

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(mock401)
      .mockResolvedValueOnce(mockRefreshFailed);

    await expect(apiFetch('/api/productos')).rejects.toThrow('Sesión expirada');
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('no intenta hacer refresh si la ruta que dio 401 es de autenticación (/api/auth/login o /api/auth/refresh)', async () => {
    const mock401 = new Response(null, { status: 401 });
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mock401);

    await expect(apiFetch('/api/auth/refresh')).rejects.toThrow('Sesión expirada');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('agrupa llamadas concurrentes de 401 para hacer un único llamado a /api/auth/refresh', async () => {
    const mock401_1 = new Response(null, { status: 401 });
    const mock401_2 = new Response(null, { status: 401 });
    const mockRefreshOk = new Response(JSON.stringify({ status: 'success' }), { status: 200 });
    const mockRetryOk1 = new Response(JSON.stringify({ data: '1' }), { status: 200 });
    const mockRetryOk2 = new Response(JSON.stringify({ data: '2' }), { status: 200 });

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const urlStr = typeof url === 'string' ? url : url.url;
      if (urlStr === '/api/auth/refresh') {
        return Promise.resolve(mockRefreshOk);
      }
      if (urlStr === '/api/primero') {
        return fetchSpy.mock.calls.some(([u]) => u === '/api/auth/refresh')
          ? Promise.resolve(mockRetryOk1)
          : Promise.resolve(mock401_1);
      }
      if (urlStr === '/api/segundo') {
        return fetchSpy.mock.calls.some(([u]) => u === '/api/auth/refresh')
          ? Promise.resolve(mockRetryOk2)
          : Promise.resolve(mock401_2);
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const [res1, res2] = await Promise.all([
      apiFetch('/api/primero'),
      apiFetch('/api/segundo'),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const refreshCalls = fetchSpy.mock.calls.filter(([u]) => u === '/api/auth/refresh');
    expect(refreshCalls.length).toBe(1);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
