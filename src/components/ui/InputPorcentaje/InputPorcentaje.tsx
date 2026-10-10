'use client';

import { InputHTMLAttributes } from 'react';
import styles from './InputPorcentaje.module.css';

/** Valida un porcentaje escrito por el usuario (acepta coma o punto decimal). */
export function validarPorcentaje(raw: string): { valor: number | null; error: string | null } {
  const texto = raw.trim().replace(',', '.');
  if (texto === '') return { valor: null, error: null };
  const valor = Number(texto);
  if (!Number.isFinite(valor)) return { valor: null, error: 'Escribí solo números.' };
  if (valor <= 0) return { valor: null, error: 'El descuento tiene que ser mayor a 0%.' };
  if (valor > 100) return { valor: null, error: 'El descuento no puede superar el 100%.' };
  return { valor: Math.round(valor * 100) / 100, error: null };
}

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string | null;
  compacto?: boolean;
}

/** Input de porcentaje con el "%" visible adentro; solo deja escribir números. */
export default function InputPorcentaje({ value, onChange, label, error, compacto, id, className, ...rest }: Props) {
  return (
    <div className={`${styles.campo} ${className ?? ''}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <div className={`${styles.control} ${error ? styles.conError : ''} ${compacto ? styles.compacto : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
          aria-invalid={Boolean(error)}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...rest}
        />
        <span className={styles.sufijo} aria-hidden>%</span>
      </div>
      {error && <span id={id ? `${id}-error` : undefined} className={styles.error} role="alert">{error}</span>}
    </div>
  );
}
