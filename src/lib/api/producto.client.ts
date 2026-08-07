import { Producto } from '../types/Producto';

export function mapApiProductoToProducto(apiProd: any): Producto {
  return {
    id: apiProd.id,
    subtipoId: apiProd.subtipo_id ?? '',
    codigo: apiProd.codigo ?? '',
    codigoBarraProveedor: apiProd.codigo_barra_proveedor ?? '',
    nombre: apiProd.nombre ?? '',
    marca: apiProd.marca ?? '',
    modelo: apiProd.modelo ?? '',
    color: apiProd.color ?? '',
    presentacion: apiProd.presentacion ?? '',
    alto: apiProd.alto ?? 0,
    ancho: apiProd.ancho ?? 0,
    profundidad: apiProd.profundidad ?? 0,
    pesoUnitario: apiProd.peso_unitario ?? 0,
    imagenUrl: apiProd.imagen_url ?? '',
    descripcion: apiProd.descripcion ?? '',
    activo: apiProd.activo ?? false,
  };
}

export const productoClient = {
  obtenerTodos: async (): Promise<Producto[]> => {
    const res = await fetch('/api/productos', { credentials: 'include' });
    if (!res.ok) throw new Error('Error al cargar productos');
    
    const json = await res.json();
    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map(mapApiProductoToProducto);
    }
    return [];
  }
};
