'use client';

import { usePaginatedList } from '../../../../lib/hooks/usePaginatedList';
import { productoClient } from '../../../../lib/api/producto.client';
import { Producto } from '../../../../lib/types/Producto';

export function useProductosFiltrados() {
  return usePaginatedList<Producto>({
    fetcher: productoClient.obtenerPaginado,
  });
}
