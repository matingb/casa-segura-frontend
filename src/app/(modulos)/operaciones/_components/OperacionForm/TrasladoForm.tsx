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

export default function TrasladoForm() {
  const router = useRouter();
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [sucursalId, setSucursalId] = useState('');
  const [sucursalDestinoId, setSucursalDestinoId] = useState('');
  const [costoFleteArs, setCostoFleteArs] = useState('');
  const [items, setItems] = useState<OperacionItemInput[]>([]);
  const [cuentas, setCuentas] = useState<OperacionCuentaInput[]>([]);
  const [modoReparto, setModoReparto] = useState<ModoReparto>('monto');
  const [repartoValido, setRepartoValido] = useState(true);

  const handleRepartoValidoChange = useCallback((v: boolean) => setRepartoValido(v), []);

  // Las cuentas solo intervienen si el traslado tiene costo de flete.
  const fleteArs = Number(costoFleteArs) || 0;

  const mismaSucursal = sucursalId && sucursalDestinoId && sucursalId === sucursalDestinoId;

  const puedeGuardar =
    Boolean(sucursalId) &&
    Boolean(sucursalDestinoId) &&
    !mismaSucursal &&
    items.length > 0 &&
    (fleteArs <= 0 || (cuentas.length > 0 && repartoValido));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeGuardar) return;

    await crear({
      tipo: 'traslado',
      sucursalId,
      modoReparto,
      items,
      cuentas,
      traslado: {
        sucursalDestinoId,
        costoFleteArs: costoFleteArs ? Number(costoFleteArs) : undefined,
      },
    });
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backLink} onClick={() => router.push('/operaciones')}>
        ← Volver a operaciones
      </button>

      <h1 className={styles.pageTitle}>Nuevo traslado</h1>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          {mismaSucursal && (
            <div className={styles.errorBanner}>La sucursal destino debe ser distinta a la sucursal de origen.</div>
          )}

          <div className={styles.section}>
            <div className={styles.grid}>
              <Select label="Sucursal origen" value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} required>
                <option value="">Seleccionar sucursal origen</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </Select>
              <Select
                label="Sucursal destino"
                value={sucursalDestinoId}
                onChange={(e) => setSucursalDestinoId(e.target.value)}
                required
              >
                <option value="">Seleccionar sucursal destino</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </Select>
              <Input
                label="Costo de flete ($)"
                type="number"
                step="0.01"
                value={costoFleteArs}
                onChange={(e) => setCostoFleteArs(e.target.value)}
              />
            </div>
          </div>

          <ItemsEditor sucursalId={sucursalId} items={items} onChange={setItems} modo="traslado" />
          {fleteArs > 0 && (
            <CuentasEditor
              cuentas={cuentas}
              onChange={setCuentas}
              modoReparto={modoReparto}
              onModoRepartoChange={setModoReparto}
              base={fleteArs}
              onValidezChange={handleRepartoValidoChange}
            />
          )}

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.push('/operaciones')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !puedeGuardar}>
              {submitting ? 'Guardando...' : 'Registrar traslado'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
