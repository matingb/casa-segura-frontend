'use client';

import { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './ClienteDescuentos.module.css';

interface Props {
  id: string;
  paso: number;
  icono: ReactNode;
  titulo: string;
  subtitulo: string;
  /** Resumen visible en el encabezado (ej.: "2 descuentos asignados"). */
  resumen?: string | null;
  abierta: boolean;
  onToggle: () => void;
  /** Muestra la flecha hacia la sección siguiente. */
  conConector?: boolean;
  children: ReactNode;
}

export default function SeccionDescuento({ id, paso, icono, titulo, subtitulo, resumen, abierta, onToggle, conConector, children }: Props) {
  return (
    <>
      <section id={id} className={`${styles.seccion} ${abierta ? styles.seccionAbierta : ''}`} aria-labelledby={`${id}-titulo`}>
        <button
          type="button"
          className={styles.seccionHeader}
          onClick={onToggle}
          aria-expanded={abierta}
          aria-controls={`${id}-contenido`}
        >
          <span className={styles.seccionPaso} aria-hidden>{paso}</span>
          <span className={styles.seccionIcono} aria-hidden>{icono}</span>
          <span className={styles.seccionTextos}>
            <span id={`${id}-titulo`} className={styles.seccionTitulo}>{titulo}</span>
            <span className={styles.seccionSubtitulo}>{subtitulo}</span>
          </span>
          {resumen && <span className={styles.seccionResumen}>{resumen}</span>}
          <ChevronDown size={18} className={`${styles.seccionChevron} ${abierta ? styles.seccionChevronAbierto : ''}`} aria-hidden />
        </button>
        {abierta && (
          <div id={`${id}-contenido`} className={styles.seccionContenido}>
            {children}
          </div>
        )}
      </section>
      {conConector && <div className={styles.conector} aria-hidden />}
    </>
  );
}
