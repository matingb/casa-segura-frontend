import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getGlobalStaleTimeMs, DEFAULT_STALE_TIME_MS } from './staleTime';

describe('getGlobalStaleTimeMs', () => {
  const originalEnv = process.env.NEXT_PUBLIC_STALE_TIME_MS;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_STALE_TIME_MS;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_STALE_TIME_MS = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_STALE_TIME_MS;
    }
  });

  it('retorna 5 minutos (300.000 ms) por defecto si la variable no está definida', () => {
    expect(getGlobalStaleTimeMs()).toBe(DEFAULT_STALE_TIME_MS);
    expect(getGlobalStaleTimeMs()).toBe(300_000);
  });

  it('retorna el valor configurado en NEXT_PUBLIC_STALE_TIME_MS', () => {
    process.env.NEXT_PUBLIC_STALE_TIME_MS = '120000';
    expect(getGlobalStaleTimeMs()).toBe(120_000);
  });

  it('ignora valores no numéricos o negativos y usa el valor por defecto', () => {
    process.env.NEXT_PUBLIC_STALE_TIME_MS = 'invalido';
    expect(getGlobalStaleTimeMs()).toBe(DEFAULT_STALE_TIME_MS);

    process.env.NEXT_PUBLIC_STALE_TIME_MS = '-500';
    expect(getGlobalStaleTimeMs()).toBe(DEFAULT_STALE_TIME_MS);
  });
});

