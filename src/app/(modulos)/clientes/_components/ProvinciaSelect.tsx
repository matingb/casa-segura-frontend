'use client';

import { useEffect, useState } from 'react';
import Select from '../../../../components/ui/Select/Select';
import Button from '../../../../components/ui/Button/Button';
import { clienteClient } from '../../../../lib/api/cliente.client';
import styles from './ClienteForm.module.css';

interface ProvinciaSelectProps {
  valorAnterior?: string;
  disabled?: boolean;
  tabIndex?: number;
}

export default function ProvinciaSelect({ valorAnterior = '', disabled, tabIndex }: ProvinciaSelectProps) {
  const [valor, setValor] = useState(valorAnterior);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    clienteClient.obtenerValoresUnicos('provincia')
      .then((opciones) => {
        if (!opciones.length) throw new Error('No se pudieron cargar las provincias.');
        if (vigente) setProvincias(opciones);
      })
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : 'No se pudieron cargar las provincias.');
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [intento]);

  const valorAnteriorFueraDeLista = valorAnterior !== '' && !provincias.includes(valorAnterior);
  const opciones = valorAnteriorFueraDeLista ? [valorAnterior, ...provincias] : provincias;

  return (
    <div>
      <Select label="Provincia" name="provincia" value={valor} onChange={(event) => setValor(event.target.value)} disabled={disabled} tabIndex={tabIndex} aria-busy={cargando}>
        <option value="">{cargando ? 'Cargando provincias…' : 'Sin especificar'}</option>
        {opciones.map((provincia) => (
          <option key={provincia} value={provincia}>
            {provincia === 'Ciudad Autónoma de Buenos Aires' ? `${provincia} (CABA)` : provincia}{!cargando && !error && provincia === valorAnterior && valorAnteriorFueraDeLista ? ' (valor anterior)' : ''}
          </option>
        ))}
      </Select>
      {error && (
        <div className={styles.validationError} role="alert">
          {error}{' '}
          <Button type="button" variant="secondary" onClick={() => {
            setCargando(true);
            setError(null);
            setIntento((actual) => actual + 1);
          }} disabled={disabled} tabIndex={tabIndex}>
            Reintentar
          </Button>
        </div>
      )}
      {!cargando && !error && valor !== '' && !provincias.includes(valor) && (
        <p className={styles.validationError}>El valor anterior no coincide con la lista. Elegí una provincia para normalizarlo.</p>
      )}
    </div>
  );
}
