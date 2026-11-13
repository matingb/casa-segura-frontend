import { formatPorcentaje } from '../../../../lib/utils/formatters';
import styles from './DescuentoEtiqueta.module.css';

export default function DescuentoEtiqueta({ descuento }: { descuento: number | null }) {
  const tieneDescuento = descuento !== null && descuento > 0;
  return (
    <span className={`${styles.etiqueta} ${tieneDescuento ? styles.conDescuento : styles.sinDescuento}`}>
      {tieneDescuento ? `${formatPorcentaje(descuento)} de descuento` : 'Sin descuento'}
    </span>
  );
}
