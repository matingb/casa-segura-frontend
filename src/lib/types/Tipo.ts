export interface DescuentoSucursal {
  id: string;
  sucursalId: string;
  sucursalNombre: string;
  porcentaje: number;
}

export interface Tipo {
  id: string;
  nombre: string;
  /** Descuento que aplica a todas las sucursales. `null` = sin descuento definido. */
  descuentoGeneral: number | null;
  /** Excepciones que pisan al general en una sucursal puntual. */
  descuentosSucursal: DescuentoSucursal[];
}
