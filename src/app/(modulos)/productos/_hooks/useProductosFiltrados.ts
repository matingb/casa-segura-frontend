import { useEffect, useMemo, useState } from 'react';
import { Producto } from '../../../../lib/types/Producto';
import { productoClient } from '../../../../lib/api/producto.client';

interface UseProductosFiltradosResult {
  busqueda: string;
  setBusqueda: (valor: string) => void;
  productos: Producto[];
}

function coincideConBusqueda(producto: Producto, busquedaNormalizada: string): boolean {
  return [producto.codigo, producto.nombre, producto.marca, producto.modelo]
    .join(' ')
    .toLowerCase()
    .includes(busquedaNormalizada);
}

export function useProductosFiltrados(): UseProductosFiltradosResult {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setTodosLosProductos] = useState<Producto[]>([]);

  useEffect(() => {
    productoClient.obtenerTodos()
      .then(setTodosLosProductos)
      .catch((err) => {
        console.error('[useProductosFiltrados] Error loading products:', err);
      });
  }, []);

  const productosFiltrados = useMemo(() => {
    const busquedaNormalizada = busqueda.trim().toLowerCase();
    if (!busquedaNormalizada) {
      return productos;
    }
    return productos.filter((producto) => coincideConBusqueda(producto, busquedaNormalizada));
  }, [busqueda, productos]);

  return { busqueda, setBusqueda, productos: productosFiltrados };
}

