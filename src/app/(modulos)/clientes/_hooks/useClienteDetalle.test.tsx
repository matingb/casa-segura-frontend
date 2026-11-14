import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClienteDetalle } from './useClienteDetalle';

const { obtenerPorId } = vi.hoisted(() => ({ obtenerPorId: vi.fn() }));
vi.mock('../../../../lib/api/cliente.client', () => ({
  clienteClient: { obtenerPorId },
}));

function pendiente<T>() {
  let resolver!: (value: T) => void;
  const promise = new Promise<T>((resolve) => { resolver = resolve; });
  return { promise, resolver };
}

const cliente = {
  id: 'c1', nombre: 'Cliente', tipoCliente: 'empresa' as const, razonSocial: '', nombreContacto: '',
  sucursales: [], tipoDocumento: '', nroDocumento: '', condicionIva: '', email: '', telefono: '',
  direccion: '', localidad: '', provincia: '', codigoPostal: '', descuentoPorcentaje: null,
  observaciones: '', activo: true,
};

describe('useClienteDetalle.revalidarSilencioso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerPorId.mockResolvedValue(cliente);
  });
  afterEach(() => vi.restoreAllMocks());

  it('marca obsoleta una respuesta tardía si una revocación inició otra carga', async () => {
    const revalidacionTardia = pendiente<typeof cliente>();
    obtenerPorId.mockResolvedValueOnce(cliente)
      .mockReturnValueOnce(revalidacionTardia.promise)
      .mockResolvedValueOnce(cliente);
    const { result } = renderHook(() => useClienteDetalle('c1'));
    await waitFor(() => expect(result.current.cliente).toEqual(cliente));

    let promesa!: ReturnType<typeof result.current.revalidarSilencioso>;
    act(() => { promesa = result.current.revalidarSilencioso(); });
    act(() => { window.dispatchEvent(new CustomEvent('alcance-pdv-revocado')); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { revalidacionTardia.resolver(cliente); });
    await expect(promesa).resolves.toEqual({ estado: 'obsoleta' });
    expect(result.current.cliente).toEqual(cliente);
  });
});
