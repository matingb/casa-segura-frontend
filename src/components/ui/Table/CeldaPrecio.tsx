import { formatARS, formatUSD } from '../../../lib/utils/formatters';
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

export function CeldaPrecioCompacta({ ars, usd }: {
  ars?: number | string | null;
  usd?: number | string | null;
}) {
  return (
    <div className={styles.valor}>
      <span className={styles.importe}>{formatARS(ars)}</span>
      <span className={styles.importeUsd}>{formatUSD(usd, true)}</span>
    </div>
  );
}
