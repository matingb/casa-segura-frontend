'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '../../../../../components/ui/Card/Card';
import Button from '../../../../../components/ui/Button/Button';
import Input from '../../../../../components/ui/Input/Input';
import { CuentaFinanciera } from '../../../../../lib/types/CuentaFinanciera';
import { cuentaFinancieraClient } from '../../../../../lib/api/cuenta-financiera.client';
import { useCuentaFinancieraDetalle } from '../../_hooks/useCuentaFinancieraDetalle';
import { formatMonto } from '../../../../../lib/utils/formatters';
import styles from './CuentaFinancieraForm.module.css';

interface CuentaFinancieraFormProps {
  title: string;
  cuenta?: CuentaFinanciera;
  cuentaId?: string;
}

export default function CuentaFinancieraForm({
  title,
  cuenta: cuentaProp,
  cuentaId,
}: CuentaFinancieraFormProps) {
  const router = useRouter();
  const { cuenta: cuentaCargada, isLoading: isLoadingDetalle, error: errorDetalle } = useCuentaFinancieraDetalle(cuentaId ?? '');
  const cuenta = cuentaId ? cuentaCargada ?? undefined : cuentaProp;
  const isEditing = Boolean(cuentaId) || Boolean(cuentaProp?.id);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const nombre = (formData.get('nombre') as string)?.trim();
    const saldo_inicial = Number(formData.get('saldo_inicial') ?? 0);
    const porcentaje_extra = Number(formData.get('porcentaje_extra') ?? 0);

    if (!nombre) {
      setError('El nombre de la cuenta es requerido.');
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEditing) {
        await cuentaFinancieraClient.actualizar(cuenta!.id, {
          nombre,
          saldo_inicial,
          porcentaje_extra,
        });
      } else {
        await cuentaFinancieraClient.crear({
          nombre,
          saldo_inicial,
          porcentaje_extra,
        });
      }
      router.push('/cuentas-financieras');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cuentaId && isLoadingDetalle) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p>Cargando cuenta financiera...</p>
        </Card>
      </div>
    );
  }

  if (cuentaId && (errorDetalle || !cuenta)) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <Card>
          <p>{errorDetalle ?? 'Cuenta financiera no encontrada'}</p>
          <Button variant="secondary" onClick={() => router.push('/cuentas-financieras')}>
            Volver al listado
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>

      <Card>
        <form onSubmit={handleSubmit} className={styles.form} key={cuenta?.id ?? 'nueva'}>
          <div className={styles.grid}>
            <div className={styles.fieldFull}>
              <Input
                label="Nombre de la cuenta"
                name="nombre"
                defaultValue={cuenta?.nombre}
                placeholder="Ej: Caja chica sucursal Norte"
                required
              />
            </div>

            <Input
              label="Saldo inicial ($)"
              name="saldo_inicial"
              type="number"
              step="0.01"
              defaultValue={cuenta?.saldoInicial ?? 0}
              placeholder="Ej: 50000.00"
            />

            <Input
              label="Porcentaje extra (%)"
              name="porcentaje_extra"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={cuenta?.porcentajeExtra ?? 0}
              placeholder="Ej: 5.00"
            />

            {isEditing && (
              <div className={styles.infoField}>
                <span className={styles.infoLabel}>Saldo actual</span>
                <span className={styles.infoValue}>
                  {formatMonto(cuenta!.saldoActual)}
                </span>
                <span className={styles.infoHint}>
                  El saldo actual se actualiza automáticamente a través de las operaciones.
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/cuentas-financieras')}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
