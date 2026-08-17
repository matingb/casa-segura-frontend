export interface OperacionItem {
  id: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  productoMarca?: string;
  productoModelo?: string;
  productoImagenUrl?: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario?: number;
  alicuotaIva: number;
  iva: number;
  subtotal: number;
}

export interface OperacionCuentaDistribucion {
  id: string;
  cuentaFinancieraId: string;
  cuentaNombre: string;
  porcentaje: number;
  porcentajeExtra?: number;
  monto: number;
  montoUsd?: number;
}

export interface OperacionDetalle {
  id: string;
  fecha: string;
  tipoId: string;
  tipoNombre: string;
  usuarioNombre: string;
  usuarioEmail?: string;
  sucursalId: string;
  sucursalNombre: string;
  total: number;
  subtotal?: number;
  descuento?: number;
  otrosImpuestos?: number;
  numeroFactura?: string;
  numeroRemito?: string;
  proveedorNombre?: string;
  sucursalDestinoNombre?: string;
  costoFlete?: number;
  movimientoTipo?: string;
  movimientoDescripcion?: string;
  items: OperacionItem[];
  cuentas: OperacionCuentaDistribucion[];
}
