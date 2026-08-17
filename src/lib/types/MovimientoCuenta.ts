export interface MovimientoCuenta {
  id: string;
  operacionId: string;
  cuentaFinancieraId: string;
  fecha: string;
  monto: number;
  descripcion: string;
  tipo?: string;
  montoUsd?: number;
  porcentajeVenta?: number;
  porcentajeExtra?: number;
  usuarioNombre?: string;
  sucursalNombre?: string;
  comprobante?: string;
}

