import { useEffect, useMemo, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';

export interface SucursalOption {
  value: string; // '' para "Todas"
  label: string;
}

interface UseStockFiltradoResult {
  busqueda: string;
  setBusqueda: (valor: string) => void;
  sucursalId: string;
  setSucursalId: (id: string) => void;
  sucursalOptions: SucursalOption[];
  stock: StockItem[];
  isLoading: boolean;
}

function coincideConBusqueda(stockItem: StockItem, busquedaNormalizada: string): boolean {
  return [
    stockItem.codigo,
    stockItem.nombre,
    stockItem.marca,
    stockItem.modelo,
    stockItem.sucursalNombre,
  ]
    .join(' ')
    .toLowerCase()
    .includes(busquedaNormalizada);
}

export function useStockFiltrado(): UseStockFiltradoResult {
  const [busqueda, setBusqueda] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    stockClient
      .obtenerTodos()
      .then(setStockTotal)
      .catch((err) => {
        console.error('[useStockFiltrado] Error loading stock:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sucursalOptions: SucursalOption[] = useMemo(() => {
    const unique = new Map<string, string>();
    stockTotal.forEach((item) => {
      if (item.sucursalId && !unique.has(item.sucursalId)) {
        unique.set(item.sucursalId, item.sucursalNombre || item.sucursalId);
      }
    });
    return [
      { value: '', label: 'Todas las sucursales' },
      ...Array.from(unique.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [stockTotal]);

  const stockFiltrado = useMemo(() => {
    const busquedaNormalizada = busqueda.trim().toLowerCase();
    return stockTotal.filter((item) => {
      const pasaBusqueda = !busquedaNormalizada || coincideConBusqueda(item, busquedaNormalizada);
      const pasaSucursal = !sucursalId || item.sucursalId === sucursalId;
      return pasaBusqueda && pasaSucursal;
    });
  }, [busqueda, sucursalId, stockTotal]);

  return { busqueda, setBusqueda, sucursalId, setSucursalId, sucursalOptions, stock: stockFiltrado, isLoading };
}
