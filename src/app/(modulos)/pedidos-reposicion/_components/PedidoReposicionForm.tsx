'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../components/ui/Card/Card';
import Button from '../../../../components/ui/Button/Button';
import Input from '../../../../components/ui/Input/Input';
import Select from '../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../context/SucursalContext';
import { stockClient } from '../../../../lib/api/stock.client';
import { proveedorClient, Proveedor } from '../../../../lib/api/proveedor.client';
import { pedidoReposicionClient } from '../../../../lib/api/pedido-reposicion.client';
import { StockItem } from '../../../../lib/types/Stock';
import styles from './PedidoReposicionForm.module.css';

export default function PedidoReposicionForm() {
  const router = useRouter();
  const { sucursales } = useSucursales();

  const [sucursalId, setSucursalId] = useState('');
  const [productoSucursalId, setProductoSucursalId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [cantidad, setCantidad] = useState('');

  const [productos, setProductos] = useState<StockItem[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    proveedorClient.obtenerTodos().then(setProveedores).catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!sucursalId) {
      setProductos([]);
      return;
    }
    setLoadingProductos(true);
    stockClient
      .obtenerPaginado({ limit: 200, offset: 0, sucursalId })
      .then((res) => setProductos(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingProductos(false));
  }, [sucursalId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productoSucursalId || !proveedorId || !cantidad || Number(cantidad) <= 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await pedidoReposicionClient.crear({
        productoSucursalId,
        proveedorId,
        cantidad: Number(cantidad),
      });
      router.push('/pedidos-reposicion');
    } catch (err) {
      console.error('Error al crear pedido de reposición:', err);
      setError(err instanceof Error ? err.message : 'Error al crear el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Nuevo pedido de reposición</h1>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.grid}>
            <Select label="Sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} required>
              <option value="">Seleccionar sucursal</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Select>

            <Select
              label="Producto"
              value={productoSucursalId}
              onChange={(e) => setProductoSucursalId(e.target.value)}
              disabled={!sucursalId || loadingProductos}
              required
            >
              <option value="">{loadingProductos ? 'Cargando...' : 'Seleccionar producto'}</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `[${p.codigo}] ` : ''}{p.nombre} (disp: {p.cantidadDisponible})
                </option>
              ))}
            </Select>

            <Select label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
              <option value="">Seleccionar proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>

            <Input
              label="Cantidad"
              type="number"
              min={1}
              step="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </div>

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.push('/pedidos-reposicion')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Registrar pedido'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
