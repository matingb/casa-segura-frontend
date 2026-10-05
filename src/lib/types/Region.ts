export interface Region {
  id: string;
  tenantId: string;
  sucursalId: string;
  nombre: string;
  descuento: number;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClienteRegion {
  id: string;
  clienteId: string;
  sucursalId: string;
  sucursalNombre: string;
  regionId: string;
  regionNombre: string;
  descuento: number;
  createdAt?: string;
}

export interface ClienteDescuentoCategoria {
  id: string;
  clienteId: string;
  tipoId: string | null;
  tipoNombre: string | null;
  subtipoId: string | null;
  subtipoNombre: string | null;
  categoriaPadreId: string | null;
  categoriaPadreNombre: string | null;
  porcentaje: number;
  nota: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClienteDescuentoProducto {
  id: string;
  clienteId: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  productoPrecioBase: number | null;
  porcentaje: number;
  nota: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DescuentosClienteResumen {
  clienteId: string;
  descuentoGeneral: number | null;
  regiones: ClienteRegion[];
  categorias: ClienteDescuentoCategoria[];
  productos: ClienteDescuentoProducto[];
}
