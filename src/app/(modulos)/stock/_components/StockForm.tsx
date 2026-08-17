'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import Select from '../../../../components/ui/Select/Select';
import { StockItem } from '../../../../lib/types/Stock';
import { useSucursales } from '../../../../context/SucursalContext';
import styles from './StockForm.module.css';

interface ProductoOption {
  id: string;
  nombre: string;
  codigo: string;
}

interface StockFormProps {
  title: string;
  stockItem?: StockItem;
}

export default function StockForm({ title, stockItem }: StockFormProps) {
  const router = useRouter();
  const isEditing = Boolean(stockItem?.id);

  const { sucursales } = useSucursales();
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(!isEditing);

  useEffect(() => {
    if (isEditing) return;

    const fetchOptions = async () => {
      try {
        const prodRes = await fetch('/api/productos', { credentials: 'include' });

        if (prodRes.ok) {
          const json = await prodRes.json();
          if (json.status === 'success' && Array.isArray(json.data)) {
            setProductos(
              json.data.map((p: any) => ({
                id: p.id,
                nombre: p.nombre ?? '',
                codigo: p.codigo ?? '',
              }))
            );
          }
        }
      } catch (err) {
        console.error('[StockForm] Error cargando opciones:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [isEditing]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const parseNum = (key: string) => {
      const val = formData.get(key);
      return val !== '' && val !== null ? Number(val) : null;
    };

    const body = isEditing
      ? {
          costo_reposicion: parseNum('costoReposicion'),
          precio_venta_ars: parseNum('precioVentaArs'),
          precio_venta_usd: parseNum('precioVentaUsd'),
          iva: parseNum('iva'),
          margen_minimo: parseNum('margenMinimo'),
          stock_minimo: parseNum('stockMinimo'),
          habilitado: formData.get('habilitado') === 'true',
        }
      : {
          producto_id: formData.get('productoId'),
          sucursal_id: formData.get('sucursalId'),
          costo_reposicion: parseNum('costoReposicion'),
          precio_venta_ars: parseNum('precioVentaArs'),
          precio_venta_usd: parseNum('precioVentaUsd'),
          iva: parseNum('iva'),
          margen_minimo: parseNum('margenMinimo'),
          stock_minimo: parseNum('stockMinimo'),
          habilitado: formData.get('habilitado') === 'true',
        };

    try {
      const url = isEditing
        ? `/api/producto-sucursal/${stockItem!.id}`
        : '/api/producto-sucursal';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        console.error('Error al guardar stock:', err.message);
        return;
      }

      router.push('/stock');
    } catch (err) {
      console.error('Error de red al guardar stock:', err);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* ── Selección de producto/sucursal ─────────────────────────── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Producto y sucursal</h2>

            {isEditing ? (
              <div className={styles.grid}>
                <div className={styles.readonlyField}>
                  <span className={styles.readonlyLabel}>Producto</span>
                  <span className={styles.readonlyValue}>
                    {stockItem!.nombre}
                    {stockItem!.codigo ? ` (${stockItem!.codigo})` : ''}
                  </span>
                </div>
                <div className={styles.readonlyField}>
                  <span className={styles.readonlyLabel}>Sucursal</span>
                  <span className={styles.readonlyValue}>{stockItem!.sucursalNombre}</span>
                </div>
              </div>
            ) : loadingOptions ? (
              <p className={styles.loadingText}>Cargando opciones...</p>
            ) : (
              <div className={styles.grid}>
                <Select label="Producto" name="productoId" required>
                  <option value="">Seleccionar producto</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo ? `[${p.codigo}] ` : ''}{p.nombre}
                    </option>
                  ))}
                </Select>
                <Select label="Sucursal" name="sucursalId" required>
                  <option value="">Seleccionar sucursal</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* ── Precios y costos ───────────────────────────────────────── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Precios y costos</h2>
            <div className={styles.grid}>
              <Input
                label="Costo de reposición ($)"
                name="costoReposicion"
                type="number"
                step="0.01"
                defaultValue={stockItem?.costoReposicion}
                placeholder="Ej: 15000"
              />
              <Input
                label="Precio venta ARS ($)"
                name="precioVentaArs"
                type="number"
                step="0.01"
                defaultValue={stockItem?.precioVentaArs}
                placeholder="Ej: 25000"
              />
              <Input
                label="Precio venta USD (u$s)"
                name="precioVentaUsd"
                type="number"
                step="0.01"
                defaultValue={stockItem?.precioVentaUsd}
                placeholder="Ej: 25"
              />
              <Input
                label="IVA (%)"
                name="iva"
                type="number"
                step="0.01"
                defaultValue={stockItem?.iva ?? 21}
                placeholder="Ej: 21"
              />
              <Input
                label="Margen mínimo (%)"
                name="margenMinimo"
                type="number"
                step="0.01"
                defaultValue={stockItem?.margenMinimo}
                placeholder="Ej: 30"
              />
            </div>
          </div>

          {/* ── Control de stock ───────────────────────────────────────── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Control de stock</h2>
            <div className={styles.grid}>
              <Input
                label="Stock mínimo"
                name="stockMinimo"
                type="number"
                step="1"
                defaultValue={stockItem?.stockMinimo ?? 0}
                placeholder="Ej: 5"
              />
              <Select
                label="Estado"
                name="habilitado"
                defaultValue={stockItem ? String(stockItem.activo) : 'true'}
              >
                <option value="true">Habilitado</option>
                <option value="false">Deshabilitado</option>
              </Select>
            </div>
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.push('/stock')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
