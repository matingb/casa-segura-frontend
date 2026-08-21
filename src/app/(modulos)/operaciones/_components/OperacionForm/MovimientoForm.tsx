'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Input from '../../../../../components/ui/Input/Input';
import Select from '../../../../../components/ui/Select/Select';
import { useSucursales } from '../../../../../context/SucursalContext';
import { OperacionCuentaInput } from '../../../../../lib/types/OperacionCrear';
import { useOperacionCrear } from '../../_hooks/useOperacionCrear';
import CuentasEditor from './CuentasEditor';
import styles from './OperacionForm.module.css';

export default function MovimientoForm() {
  const router = useRouter();
  const { sucursales } = useSucursales();
  const { submitting, error, crear } = useOperacionCrear();

  const [sucursalId, setSucursalId] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<'ingreso' | 'egreso'>('ingreso');
  const [descripcion, setDescripcion] = useState('');
  const [cuentas, setCuentas] = useState<OperacionCuentaInput[]>([]);
  const [repartoValido, setRepartoValido] = useState(false);

  const handleRepartoValidoChange = useCallback((v: boolean) => setRepartoValido(v), []);

  const puedeGuardar = Boolean(sucursalId) && cuentas.length > 0 && repartoValido;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeGuardar) return;

    await crear({
      tipo: 'movimiento',
      sucursalId,
      // El monto del movimiento lo deriva el backend de las cuentas cargadas.
      cuentas,
      movimiento: {
        tipo: tipoMovimiento,
        descripcion: descripcion || undefined,
      },
    });
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backLink} onClick={() => router.push('/operaciones')}>
        ← Volver a operaciones
      </button>

      <h1 className={styles.pageTitle}>
        Nuevo movimiento financiero — {tipoMovimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}
      </h1>

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
              <Select
                label="Tipo"
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value as 'ingreso' | 'egreso')}
              >
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </Select>
            </div>
            <Input label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>

          <CuentasEditor
            cuentas={cuentas}
            onChange={setCuentas}
            modoReparto="monto"
            onModoRepartoChange={() => {}}
            derivarTotalDeCuentas
            onValidezChange={handleRepartoValidoChange}
          />

          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={() => router.push('/operaciones')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting || !puedeGuardar}>
              {submitting ? 'Guardando...' : 'Registrar movimiento'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
