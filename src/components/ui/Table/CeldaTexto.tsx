import { ReactNode } from 'react';
import TextoRecortado from '../TextoRecortado/TextoRecortado';
import styles from './CeldaTexto.module.css';

interface CeldaTextoProps {
  /** Dato principal de la celda (más jerarquía visual). */
  principal: ReactNode;
  /** Líneas secundarias, en gris; las vacías no se muestran. */
  secundarias?: (ReactNode | null | undefined | false)[];
  /** Opcional: máximo de líneas del dato principal (se corta con "…" y tooltip). */
  lineasPrincipal?: number;
  /** Opcional: máximo de líneas de cada dato secundario de texto. */
  lineasSecundarias?: number;
}

/** Recorta solo texto plano; otros contenidos se muestran tal cual. */
function recortar(contenido: ReactNode, lineas?: number) {
  return lineas && typeof contenido === 'string' ? <TextoRecortado lineas={lineas}>{contenido}</TextoRecortado> : contenido;
}

/**
 * Celda de tabla con un dato principal y líneas secundarias debajo, para
 * agrupar información en pocas columnas (las celdas hacen wrap: pensado para
 * tablas con `ajustarAncho`). Sin límites de líneas, el texto se muestra completo.
 */
export default function CeldaTexto({ principal, secundarias = [], lineasPrincipal, lineasSecundarias }: CeldaTextoProps) {
  const lineas = secundarias.filter((linea) => linea !== null && linea !== undefined && linea !== false && linea !== '');
  return (
    <div className={styles.celda}>
      <span className={styles.principal}>{recortar(principal, lineasPrincipal)}</span>
      {lineas.map((linea, i) => (
        <span key={i} className={styles.secundaria}>
          {recortar(linea, lineasSecundarias)}
        </span>
      ))}
    </div>
  );
}
