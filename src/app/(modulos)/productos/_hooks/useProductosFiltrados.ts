import { useEffect, useMemo, useState } from 'react';
import { Producto } from '../../../../lib/types/Producto';

interface UseProductosFiltradosResult {
  busqueda: string;
  setBusqueda: (valor: string) => void;
  productos: Producto[];
}

function mapApiProductoToProducto(apiProd: any): Producto {
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

function coincideConBusqueda(producto: Producto, busquedaNormalizada: string): boolean {
  return [producto.codigo, producto.nombre, producto.marca, producto.modelo]
    .join(' ')
    .toLowerCase()
    .includes(busquedaNormalizada);
}

export function useProductosFiltrados(): UseProductosFiltradosResult {
  const [busqueda, setBusqueda] = useState('');
  const [dbProductos, setDbProductos] = useState<Producto[]>([]);

  useEffect(() => {
    fetch('/api/productos', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar productos');
        return res.json();
      })
      .then((json) => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          setDbProductos(json.data.map(mapApiProductoToProducto));
        }
      })
      .catch((err) => {
        console.error('[useProductosFiltrados] Error loading products:', err);
      });
  }, []);

  const productos = useMemo(() => {
    const busquedaNormalizada = busqueda.trim().toLowerCase();
    if (!busquedaNormalizada) {
      return dbProductos;
    }
    return dbProductos.filter((producto) => coincideConBusqueda(producto, busquedaNormalizada));
  }, [busqueda, dbProductos]);

  return { busqueda, setBusqueda, productos };
}

