import { CSSProperties } from 'react';
import styles from './TextoRecortado.module.css';

interface TextoRecortadoProps {
  children: string;
  /** Máximo de líneas visibles; lo que no entra se corta con "…". */
  lineas?: number;
  /** Texto completo del tooltip (por defecto, el mismo texto). */
  title?: string;
  className?: string;
}

/**
 * Texto que ocupa como máximo `lineas` líneas y muestra el contenido completo
 * en el tooltip. Recorta por líneas (no con nowrap) para que, dentro de una
 * tabla, la columna se pueda angostar sin forzar scroll horizontal.
 */
export default function TextoRecortado({ children, lineas = 1, title, className }: TextoRecortadoProps) {
  return (
    <span
      className={className ? `${styles.recortado} ${className}` : styles.recortado}
      style={{ '--lineas': lineas } as CSSProperties}
      title={title ?? children}
    >
      {children}
    </span>
  );
}
