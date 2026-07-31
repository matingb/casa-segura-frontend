import { useMemo, useState } from 'react';
import { Producto } from '../../../../lib/types/Producto';
import { productosMock } from '../../../../lib/mocks/productos';

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

  const productos = useMemo(() => {
    const busquedaNormalizada = busqueda.trim().toLowerCase();
    if (!busquedaNormalizada) {
      return productosMock;
    }
    return productosMock.filter((producto) => coincideConBusqueda(producto, busquedaNormalizada));
  }, [busqueda]);

  return { busqueda, setBusqueda, productos };
}
