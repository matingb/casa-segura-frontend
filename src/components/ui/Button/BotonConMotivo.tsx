'use client';

import { useId, type ComponentProps } from 'react';
import Button from './Button';
import styles from './BotonConMotivo.module.css';

type Props = ComponentProps<typeof Button> & {
  motivo?: string;
  nativo?: boolean;
  tooltip?: boolean;
};

export const SIN_CAMBIOS = 'No hay cambios para guardar.';

export default function BotonConMotivo({ motivo, disabled, nativo, tooltip, variant, ...props }: Props) {
  const id = useId();
  const mensaje = disabled ? undefined : motivo;
  const mostrarTooltip = Boolean(tooltip && mensaje);
  const atributos = {
    ...props,
    disabled: disabled || Boolean(motivo),
    'aria-describedby': [props['aria-describedby'], mensaje ? id : undefined].filter(Boolean).join(' ') || undefined,
  };

  return (
    <span
      className={mostrarTooltip ? styles.accionTooltip : styles.accion}
      tabIndex={mostrarTooltip ? 0 : undefined}
      role={mostrarTooltip ? 'group' : undefined}
      aria-label={mostrarTooltip ? 'Acción no disponible' : undefined}
      aria-describedby={mostrarTooltip ? id : undefined}
    >
      {nativo ? <button {...atributos} /> : <Button variant={variant} {...atributos} />}
      {mostrarTooltip ? (
        <span id={id} className={styles.tooltip} role="tooltip">{mensaje}</span>
      ) : (
        <span id={id} className={styles.motivo} aria-live="polite">{mensaje}</span>
      )}
    </span>
  );
}
