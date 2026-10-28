import { CSSProperties } from 'react';
import styles from './TextoRecortado.module.css';

interface TextoRecortadoProps {
  children: string;
  /** Máximo de líneas visibles; lo que no entra se corta con "…". */
  lineas?: number;
  /** Texto completo del tooltip (por defecto, el mismo texto). */
  title?: string;
  className?: string;
  /**
   * Corta en cualquier letra en lugar de entre palabras: el "…" cae justo al
   * final del espacio, sin dejar hueco (útil si a la derecha sigue otro elemento
   * o si el texto va dentro de un chip).
   */
  cortarEnCualquierLetra?: boolean;
}

/**
 * Texto que ocupa como máximo `lineas` líneas y muestra el contenido completo
 * en el tooltip. Recorta por líneas (no con nowrap) para que, dentro de una
 * tabla, la columna se pueda angostar sin forzar scroll horizontal.
 */
export default function TextoRecortado({ children, lineas = 1, title, className, cortarEnCualquierLetra = false }: TextoRecortadoProps) {
  const clases = [styles.recortado, cortarEnCualquierLetra && styles.cualquierLetra, className].filter(Boolean).join(' ');
  return (
    <span
      className={clases}
      style={{ '--lineas': lineas } as CSSProperties}
      title={title ?? children}
    >
      {children}
    </span>
  );
}
