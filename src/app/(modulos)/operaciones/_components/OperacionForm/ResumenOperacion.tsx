'use client';

import Button from '../../../../../components/ui/Button/Button';
import { formatARS } from '../../../../../lib/utils/formatters';
import styles from './ResumenOperacion.module.css';

interface LineaExtra {
  etiqueta: string;
  valor: number;
  /** True para mostrarlo restando, como un descuento. */
  negativo?: boolean;
}

interface ResumenOperacionProps {
  /** Suma de los importes de productos, sin recargos. */
  mercaderia: number;
  recargos: number;
  total: number;
  etiquetaTotal: string;
  /** Líneas propias de cada operación, por ejemplo el descuento de una venta. */
  lineasExtra?: LineaExtra[];
  /** Texto del botón de registrar, que vive pegado al total. */
  etiquetaAccion: string;
  submitting: boolean;
}

export default function ResumenOperacion({
  mercaderia,
  recargos,
  total,
  etiquetaTotal,
  lineasExtra = [],
  etiquetaAccion,
  submitting,
}: ResumenOperacionProps) {
  return (
    <aside className={styles.panel} aria-label="Resumen de la operación">
      <h3 className={styles.titulo}>Resumen</h3>

      <div className={styles.linea}>
        <span className={styles.lineaEtiqueta}>Mercadería</span>
        <span className={styles.lineaValor}>{formatARS(mercaderia)}</span>
      </div>

      {lineasExtra.map((linea) => (
        <div key={linea.etiqueta} className={styles.linea}>
          <span className={styles.lineaEtiqueta}>{linea.etiqueta}</span>
          <span className={styles.lineaValor}>
            {linea.negativo && linea.valor > 0 ? '−' : ''}
            {formatARS(linea.valor)}
          </span>
        </div>
      ))}

      <div className={styles.linea}>
        <span className={styles.lineaEtiqueta}>Recargos</span>
        <span className={styles.lineaValor}>{formatARS(recargos)}</span>
      </div>

      <div className={styles.total}>
        <span className={styles.totalEtiqueta}>{etiquetaTotal}</span>
        <span className={styles.totalValor}>{formatARS(total)}</span>
      </div>

      <div className={styles.accion}>
        <Button type="submit" variant="primary" disabled={submitting} className={styles.botonAncho}>
          {submitting ? 'Guardando...' : etiquetaAccion}
        </Button>
      </div>
    </aside>
  );
}
