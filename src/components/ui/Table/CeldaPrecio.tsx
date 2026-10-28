import styles from './CeldaPrecio.module.css';

interface CeldaPrecioProps {
  /** Importe en ARS ya formateado (o "—"). */
  ars: string;
  /** Importe en USD ya formateado (o "—"). */
  usd: string;
}

/**
 * Precio en ARS y USD para tablas: dos columnas compactas, con el importe arriba
 * y la moneda abajo, alineadas entre filas.
 */
export default function CeldaPrecio({ ars, usd }: CeldaPrecioProps) {
  return (
    <div className={styles.celda}>
      <span className={styles.valor}>
        <span className={styles.importe}>{ars}</span>
        <span className={styles.moneda}>ARS</span>
      </span>
      <span className={styles.valor}>
        <span className={styles.importe}>{usd}</span>
        <span className={styles.moneda}>USD</span>
      </span>
    </div>
  );
}
