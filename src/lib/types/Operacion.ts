export type EstadoFinanciero = 'PENDIENTE' | 'PARCIAL' | 'SALDADA' | 'SOBREPAGADA';

export interface Operacion {
  id: string;
  sucursalId?: string;
  tipoId: string;
  tipoNombre: string;
  usuarioNombre: string;
  sucursalNombre: string;
  monto: number;
  descripcion: string;
  fecha: string;
  estadoFinanciero?: EstadoFinanciero;
  cancelledAt?: string;
}
