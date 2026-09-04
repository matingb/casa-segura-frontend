export type UnidadDimension = 'mm' | 'cm' | 'm';
export type UnidadPeso = 'g' | 'kg';

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
  unidadAlto: UnidadDimension;
  ancho: number;
  unidadAncho: UnidadDimension;
  profundidad: number;
  unidadProfundidad: UnidadDimension;
  pesoUnitario: number;
  unidadPesoUnitario: UnidadPeso;
  imagenUrl: string;
  descripcion: string;
  activo: boolean;
  precioBase: number | null;
  costoReposicionBase?: number | null;
  codigoQr: string;
}
