import { DescuentoSucursal } from './Tipo';

export interface Subtipo {
  id: string;
  tipoId: string;
  nombre: string;
  /** Descuento propio de la subcategoría. `null` = hereda el de su categoría. */
  descuentoGeneral: number | null;
  /** Excepciones que pisan al general en una sucursal puntual. */
  descuentosSucursal: DescuentoSucursal[];
}
