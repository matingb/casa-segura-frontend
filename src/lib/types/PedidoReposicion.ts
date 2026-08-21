export interface PedidoReposicion {
  id: string;
  tenantId: string;
  productoSucursalId: string;
  usuarioId: string;
  proveedorId: string;
  cantidad: number;
  estado: string;
  fecha: string;
  
  productoNombre: string;
  productoCodigo: string;
  sucursalNombre: string;
  usuarioNombre: string;
  proveedorNombre: string;
}

export interface PedidoReposicionCrearInput {
  productoSucursalId: string;
  proveedorId: string;
  cantidad: number;
}
