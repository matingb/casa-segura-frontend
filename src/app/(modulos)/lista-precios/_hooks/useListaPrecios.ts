'use client';

import { useEffect, useMemo, useState } from 'react';
import { StockItem } from '../../../../lib/types/Stock';
import { stockClient } from '../../../../lib/api/stock.client';
import { useSucursales, SucursalOption } from '../../../../context/SucursalContext';
import { useClasificacion } from '../../../../lib/hooks/useClasificacion';
import type { SortCriterion } from '../../../../components/ui/Table/Table';

export type { SucursalOption };

const PAGE_SIZE = 10;

const FILTER_FIELDS = ['marca', 'modelo', 'subtipo'] as const;

function getValor(item: StockItem, sortBy: string, getSubtipoNombre: (id: string) => string): string | number {
  switch (sortBy) {
    case 'codigo':
      return item.codigo;
    case 'nombre':
      return item.nombre;
    case 'marca':
      return item.marca;
    case 'modelo':
      return item.modelo;
    case 'subtipo':
      return getSubtipoNombre(item.subtipoId);
    case 'precioArs':
      return item.precioVentaArs;
    case 'precioUsd':
      return item.precioVentaUsd;
    case 'iva':
      return item.iva;
    default:
      return '';
  }
}

interface UseListaPreciosResult {
  sucursalId: string;
  sucursalOptions: SucursalOption[];
  items: StockItem[];
  pageItems: StockItem[];
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  sucursalNombre: string;
  sort: SortCriterion[];
  onSortChange: (columnKey: string) => void;
  filters: Record<string, string>;
  onFilterChange: (columnKey: string, value: string) => void;
  filterOptions: Record<string, { value: string; label: string }[]>;
}

export function useListaPrecios(): UseListaPreciosResult {
  const [stockTotal, setStockTotal] = useState<StockItem[]>([]);
  const { sucursales } = useSucursales();
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [sort, setSort] = useState<SortCriterion[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { getSubtipoNombre } = useClasificacion();

  const sucursalId = filters.sucursal ?? '';

  // La lista de precios siempre opera sobre una sucursal: si no hay ninguna
  // elegida todavía, se selecciona la primera disponible.
  useEffect(() => {
    if (sucursales.length > 0 && !sucursalId) {
      setFilters((prev) => ({ ...prev, sucursal: sucursales[0].id }));
    }
  }, [sucursales, sucursalId]);

  useEffect(() => {
    async function cargar() {
      setIsLoading(true);
      try {
        const stockData = await stockClient.obtenerTodos();
        setStockTotal(stockData);
      } catch (err) {
        console.error('[useListaPrecios] Error al cargar datos:', err);
      } finally {
        setIsLoading(false);
      }
    }

    cargar();
  }, []);

  const sucursalOptions: SucursalOption[] = useMemo(() => {
    return sucursales.map((s) => ({ value: s.id, label: s.nombre }));
  }, [sucursales]);

  const sucursalNombre = useMemo(() => {
    return sucursales.find((s) => s.id === sucursalId)?.nombre ?? '';
  }, [sucursales, sucursalId]);

  const itemsSucursal = useMemo(() => {
    if (!sucursalId) return [];
    return stockTotal.filter(
      (item) => item.sucursalId === sucursalId && item.activo
    );
  }, [stockTotal, sucursalId]);

  const filterOptions = useMemo(() => {
    const options: Record<string, { value: string; label: string }[]> = {};
    FILTER_FIELDS.forEach((campo) => {
      const valores = new Set<string>();
      itemsSucursal.forEach((item) => {
        const v = String(getValor(item, campo, getSubtipoNombre) ?? '').trim();
        if (v) valores.add(v);
      });
      options[campo] = Array.from(valores)
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v }));
    });
    options.sucursal = sucursalOptions;
    return options;
  }, [itemsSucursal, getSubtipoNombre, sucursalOptions]);

  const itemsFiltrados = useMemo(() => {
    const filtroCodigo = filters.codigo?.trim().toLowerCase();
    const filtroNombre = filters.nombre?.trim().toLowerCase();

    return itemsSucursal.filter((item) => {
      if (filtroCodigo && !item.codigo.toLowerCase().includes(filtroCodigo)) return false;
      if (filtroNombre && !item.nombre.toLowerCase().includes(filtroNombre)) return false;
      for (const campo of FILTER_FIELDS) {
        const filtro = filters[campo];
        if (filtro && String(getValor(item, campo, getSubtipoNombre)) !== filtro) return false;
      }
      return true;
    });
  }, [itemsSucursal, filters, getSubtipoNombre]);

  const items = useMemo(() => {
    if (sort.length === 0) return itemsFiltrados;
    const sorted = [...itemsFiltrados];
    sorted.sort((a, b) => {
      for (const criterio of sort) {
        const va = getValor(a, criterio.sortBy, getSubtipoNombre);
        const vb = getValor(b, criterio.sortBy, getSubtipoNombre);
        let cmp: number;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else {
          cmp = String(va).localeCompare(String(vb));
        }
        if (cmp !== 0) return criterio.sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [itemsFiltrados, sort, getSubtipoNombre]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const handleSortChange = (columnKey: string) => {
    setSort((prev) => {
      const idx = prev.findIndex((c) => c.sortBy === columnKey);

      if (idx === -1) return [...prev, { sortBy: columnKey, sortDir: 'asc' }];
      if (prev[idx].sortDir === 'asc') {
        const next = [...prev];
        next[idx] = { sortBy: columnKey, sortDir: 'desc' };
        return next;
      }
      return prev.filter((c) => c.sortBy !== columnKey);
    });
    setPage(1);
  };

  const handleFilterChange = (columnKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [columnKey]: value }));
    setPage(1);
  };

  return {
    sucursalId,
    sucursalOptions,
    items,
    pageItems,
    page: Math.min(page, totalPages),
    totalPages,
    setPage,
    isLoading,
    sucursalNombre,
    sort,
    onSortChange: handleSortChange,
    filters,
    onFilterChange: handleFilterChange,
    filterOptions,
  };
}
