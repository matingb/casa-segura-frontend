export type TipoCliente = 'persona' | 'empresa';

export interface ClienteSucursal {
  id: string;
  nombre: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  tipoCliente: TipoCliente;
  razonSocial: string;
  nombreContacto: string;
  sucursales: ClienteSucursal[];
  tipoDocumento: string;
  nroDocumento: string;
  condicionIva: string;
  email: string;
  telefono: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  descuentoPorcentaje: number | null;
  observaciones: string;
  activo: boolean;
}

export const TIPOS_CLIENTE: { value: TipoCliente; label: string }[] = [
  { value: 'persona', label: 'Persona' },
  { value: 'empresa', label: 'Empresa' },
];

/**
 * En la base `condicion_iva` es texto libre: estas son las condiciones
 * habituales que ofrece el formulario, pero se puede escribir otra.
 */
export const CONDICIONES_IVA = [
  'Responsable Inscripto',
  'Monotributo',
  'Consumidor Final',
  'Exento',
  'No Alcanzado',
];

export const TIPOS_DOCUMENTO = ['DNI', 'CUIT', 'CUIL', 'Pasaporte', 'LC', 'LE'];

export function tipoClienteLabel(tipo: TipoCliente | string): string {
  return TIPOS_CLIENTE.find((t) => t.value === tipo)?.label ?? '—';
}
