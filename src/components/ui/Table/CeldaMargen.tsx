import { formatPorcentaje } from '../../../lib/utils/formatters';
import { calcularMargenVenta } from '../../../lib/utils/margen-venta';
import styles from './CeldaMargen.module.css';

interface CeldaMargenProps {
  precioArs?: number | string | null;
  precioUsd?: number | string | null;
  costoArs?: number | string | null;
  costoUsd?: number | string | null;
}

export default function CeldaMargen({ precioArs, precioUsd, costoArs, costoUsd }: CeldaMargenProps) {
  const usarArs = precioArs != null && costoArs != null;
  const margen = calcularMargenVenta(usarArs ? precioArs : precioUsd, usarArs ? costoArs : costoUsd);

  return (
    <span
      className={`${styles.valor} ${margen === null ? styles.vacio : margen < 0 ? styles.negativo : ''}`}
      title={margen === null
        ? 'Se necesita un precio de venta mayor que cero y un costo en la misma moneda para calcular el margen.'
        : '(Precio de venta − Costo) / Precio de venta × 100'}
    >
      {margen === null ? '—' : formatPorcentaje(margen)}
    </span>
  );
}
