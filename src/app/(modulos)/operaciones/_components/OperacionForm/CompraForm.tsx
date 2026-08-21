'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Input from '../../../../../components/ui/Input/Input';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { proveedorClient, Proveedor } from '../../../../../lib/api/proveedor.client';
import { OperacionItemInput, OperacionCuentaInput, ModoReparto } from '../../../../../lib/types/OperacionCrear';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
import ItemsEditor from './ItemsEditor';
import CuentasEditor from './CuentasEditor';
import styles from './OperacionForm.module.css';

export default function CompraForm() {
  const router = useRouter();
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [sucursalId, setSucursalId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [numeroRemito, setNumeroRemito] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [items, setItems] = useState<OperacionItemInput[]>([]);
  const [cuentas, setCuentas] = useState<OperacionCuentaInput[]>([]);
  const [modoReparto, setModoReparto] = useState<ModoReparto>('monto');
  const [repartoValido, setRepartoValido] = useState(true);

  const handleRepartoValidoChange = useCallback((v: boolean) => setRepartoValido(v), []);

  useEffect(() => {
    proveedorClient.obtenerTodos().then(setProveedores).catch((err) => console.error(err));
  }, []);

  const totalArs = items.reduce((sum, item) => sum + item.cantidad * (item.costoUnitArs ?? 0), 0);

  const puedeGuardar =
    Boolean(sucursalId) && Boolean(proveedorId) && items.length > 0 && cuentas.length > 0 && repartoValido;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeGuardar) return;

    await crear({
      tipo: 'compra',
      sucursalId,
      modoReparto,
      items,
      cuentas,
      compra: {
        proveedorId,
        numeroRemito: numeroRemito || undefined,
        numeroFactura: numeroFactura || undefined,
        totalArs,
      },
    });
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backLink} onClick={() => router.push('/operaciones')}>
        ← Volver a operaciones
      </button>

      <h1 className={styles.pageTitle}>Nueva compra</h1>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.section}>
            <div className={styles.grid}>
              <Select label="Sucursal" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} required>
                <option value="">Seleccionar sucursal</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </Select>
              <Select label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
                <option value="">Seleccionar proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>
              <Input label="Número de remito" value={numeroRemito} onChange={(e) => setNumeroRemito(e.target.value)} />
              <Input label="Número de factura" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
            </div>
          </div>

          <ItemsEditor sucursalId={sucursalId} items={items} onChange={setItems} modo="compra" />
          <CuentasEditor
            cuentas={cuentas}
            onChange={setCuentas}
            modoReparto={modoReparto}
            onModoRepartoChange={setModoReparto}
            base={totalArs}
            onValidezChange={handleRepartoValidoChange}
          />

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.push('/operaciones')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !puedeGuardar}>
              {submitting ? 'Guardando...' : 'Registrar compra'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
