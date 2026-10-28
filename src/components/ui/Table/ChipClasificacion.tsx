import TextoRecortado from '../TextoRecortado/TextoRecortado';
import styles from './ChipClasificacion.module.css';

interface ChipClasificacionProps {
  /** Nombre de la clasificación (ej.: subtipo). */
  texto: string;
  /** Sin clasificación: chip gris (ej.: "Sin subtipo"). */
  vacio?: boolean;
}

/**
 * Chip discreto para la clasificación de un producto en tablas: una línea,
 * ancho máximo y "…" con tooltip, para que un nombre largo no ensanche la columna.
 */
export default function ChipClasificacion({ texto, vacio = false }: ChipClasificacionProps) {
  return (
    <span className={vacio ? `${styles.chip} ${styles.vacio}` : styles.chip}>
      <TextoRecortado cortarEnCualquierLetra>{texto}</TextoRecortado>
    </span>
  );
}
