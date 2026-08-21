'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Input from '../../../../../components/ui/Input/Input';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { OperacionItemInput, OperacionCuentaInput, ModoReparto } from '../../../../../lib/types/OperacionCrear';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
import ItemsEditor from './ItemsEditor';
import CuentasEditor from './CuentasEditor';
import styles from './OperacionForm.module.css';

export default function VentaForm() {
  const router = useRouter();
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [sucursalId, setSucursalId] = useState('');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [descuentoArs, setDescuentoArs] = useState('');
  const [items, setItems] = useState<OperacionItemInput[]>([]);
  const [cuentas, setCuentas] = useState<OperacionCuentaInput[]>([]);
  const [modoReparto, setModoReparto] = useState<ModoReparto>('monto');
  const [margenInvalido, setMargenInvalido] = useState(false);
  const [repartoValido, setRepartoValido] = useState(true);

  const handleMargenInvalidoChange = useCallback((v: boolean) => setMargenInvalido(v), []);
  const handleRepartoValidoChange = useCallback((v: boolean) => setRepartoValido(v), []);

  const subtotalArs = items.reduce((sum, item) => sum + item.cantidad * (item.precioUnitArs ?? 0), 0);
  // Base sobre la que se reparte entre cuentas (sin recargos).
  const baseReparto = subtotalArs - (Number(descuentoArs) || 0);

  const puedeGuardar =
    Boolean(sucursalId) && items.length > 0 && cuentas.length > 0 && !margenInvalido && repartoValido;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeGuardar) return;

    await crear({
      tipo: 'venta',
      sucursalId,
      modoReparto,
      items,
      cuentas,
      venta: {
        numeroComprobante: numeroComprobante || undefined,
        subtotalArs,
        descuentoArs: descuentoArs ? Number(descuentoArs) : undefined,
        // El total lo recalcula el backend sumando los recargos de cada cuenta.
      },
    });
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backLink} onClick={() => router.push('/operaciones')}>
        ← Volver a operaciones
      </button>

      <h1 className={styles.pageTitle}>Nueva venta</h1>

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
              <Input label="Número de comprobante" value={numeroComprobante} onChange={(e) => setNumeroComprobante(e.target.value)} />
              <Input
                label="Descuento ($)"
                type="number"
                step="0.01"
                value={descuentoArs}
                onChange={(e) => setDescuentoArs(e.target.value)}
              />
            </div>
          </div>

          <ItemsEditor
            sucursalId={sucursalId}
            items={items}
            onChange={setItems}
            modo="venta"
            onMargenInvalidoChange={handleMargenInvalidoChange}
          />
          <CuentasEditor
            cuentas={cuentas}
            onChange={setCuentas}
            modoReparto={modoReparto}
            onModoRepartoChange={setModoReparto}
            base={baseReparto}
            onValidezChange={handleRepartoValidoChange}
          />

          {margenInvalido && (
            <div className={styles.errorBanner}>
              Hay productos con un precio por debajo del margen mínimo configurado. Corregí los precios marcados para continuar.
            </div>
          )}

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.push('/operaciones')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !puedeGuardar}>
              {submitting ? 'Guardando...' : 'Registrar venta'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
