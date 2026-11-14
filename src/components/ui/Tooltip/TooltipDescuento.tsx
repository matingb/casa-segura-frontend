'use client';

import { AporteDescuentoLista } from '../../../lib/types/ListaPreciosCliente';
import { formatoDescuentosCadena, obtenerNombreNivel } from '../../../lib/utils/niveles-descuento';
import { formatPorcentaje } from '../../../lib/utils/formatters';
import Tooltip from './Tooltip';
import styles from './TooltipDescuento.module.css';

export interface TooltipDescuentoProps {
  aportes?: AporteDescuentoLista[];
  descuentoTotal?: number;
  className?: string;
}

export default function TooltipDescuento({
  aportes = [],
  descuentoTotal,
  className,
}: TooltipDescuentoProps) {
  const activos = aportes.filter((a) => Number(a.porcentaje) > 0);
  const texto = formatoDescuentosCadena(aportes, descuentoTotal);

  if (activos.length === 0 && (!descuentoTotal || descuentoTotal <= 0)) {
    return <span className={className}>{texto}</span>;
  }

  const contenido = (
    <div className={styles.contenido}>
      <div className={styles.titulo}>Descuentos aplicados</div>
      <div className={styles.lista}>
        {activos.length > 0 ? (
          activos.map((aporte, i) => (
            <div key={i} className={styles.fila}>
              <span className={styles.nivel}>{obtenerNombreNivel(aporte.nivel)}:</span>
              <span className={styles.porcentaje}>{formatPorcentaje(aporte.porcentaje)}</span>
            </div>
          ))
        ) : (
          <div className={styles.fila}>
            <span className={styles.nivel}>Descuento:</span>
            <span className={styles.porcentaje}>{formatPorcentaje(descuentoTotal!)}</span>
          </div>
        )}
      </div>
      {activos.length > 1 && descuentoTotal != null && (
        <div className={styles.totalFila}>
          <span className={styles.totalLabel}>Total efectivo:</span>
          <span className={styles.totalPorcentaje}>{formatPorcentaje(descuentoTotal)}</span>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={contenido}>
      <span className={`${styles.triggerDescuento} ${className ?? ''}`}>
        {texto}
      </span>
    </Tooltip>
  );
}
