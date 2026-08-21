export interface OperacionItemInput {
  productoSucursalId: string;
  cantidad: number;
  precioUnitArs?: number;
  precioUnitUsd?: number;
  costoUnitArs?: number;
  costoUnitUsd?: number;
  alicuotaIva?: number;
  ivaArs?: number;
  ivaUsd?: number;
}

/** Cómo se reparte el total de la operación entre sus cuentas financieras. */
export type ModoReparto = 'porcentaje' | 'monto';

export interface OperacionCuentaInput {
  cuentaFinancieraId: string;
  /** Requerido en modo 'porcentaje': qué % del total va a esta cuenta. */
  porcentajeVenta?: number;
  /** Lo calcula el backend a partir de la cuenta; no se envía desde el cliente. */
  porcentajeExtra?: number;
  /** Requerido en modo 'monto': lo que cobra la cuenta, con recargo incluido. */
  montoArs?: number;
  montoUsd?: number;
}

export type OperacionCrearInput =
  | {
      tipo: 'compra';
      sucursalId: string;
      fecha?: string;
      modoReparto?: ModoReparto;
      items: OperacionItemInput[];
      cuentas: OperacionCuentaInput[];
      compra: {
        proveedorId: string;
        numeroRemito?: string;
        numeroFactura?: string;
        subtotalArs?: number;
        subtotalUsd?: number;
        otrosImpuestosArs?: number;
        otrosImpuestosUsd?: number;
        totalArs?: number;
        totalUsd?: number;
      };
    }
  | {
      tipo: 'venta';
      sucursalId: string;
      fecha?: string;
      modoReparto?: ModoReparto;
      items: OperacionItemInput[];
      cuentas: OperacionCuentaInput[];
      venta: {
        numeroComprobante?: string;
        subtotalArs?: number;
        subtotalUsd?: number;
        descuentoArs?: number;
        descuentoUsd?: number;
        totalArs?: number;
        totalUsd?: number;
      };
    }
  | {
      tipo: 'traslado';
      sucursalId: string;
      fecha?: string;
      modoReparto?: ModoReparto;
      items: OperacionItemInput[];
      cuentas: OperacionCuentaInput[];
      traslado: {
        sucursalDestinoId: string;
        costoFleteArs?: number;
      };
    }
  | {
      tipo: 'movimiento';
      sucursalId: string;
      fecha?: string;
      modoReparto?: ModoReparto;
      cuentas: OperacionCuentaInput[];
      movimiento: {
        tipo: 'ingreso' | 'egreso';
        descripcion?: string;
        /** Derivado de las cuentas por el backend; no se envía desde el cliente. */
        montoArs?: number;
        montoUsd?: number;
      };
    };
