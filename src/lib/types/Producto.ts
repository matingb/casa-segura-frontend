export interface Producto {
  id: string;
  subtipoId: string;
  codigo: string;
  codigoBarraProveedor: string;
  nombre: string;
  marca: string;
  modelo: string;
  color: string;
  presentacion: string;
  alto: number;
  ancho: number;
  profundidad: number;
  pesoUnitario: number;
  imagenUrl: string;
  descripcion: string;
  activo: boolean;
  precioBase: number;
  codigoQr: string;
}
