'use client';

import { ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

interface TooltipProps {
  /** Contenido del tooltip. */
  contenido: ReactNode;
  /** Elemento que lo dispara al pasar el mouse o al enfocarlo con el teclado. */
  children: ReactNode;
  className?: string;
}

/** Separación entre el disparador y el tooltip, y margen mínimo contra los bordes de la ventana. */
const SEPARACION = 6;
const MARGEN = 8;

/**
 * Tooltip propio (no el `title` nativo). Se dibuja en un portal con posición
 * fija para que no lo recorte un contenedor con scroll, como el de las tablas.
 * Se abre arriba del disparador; si no entra, abajo. Se cierra al hacer scroll.
 */
export default function Tooltip({ contenido, children, className }: TooltipProps) {
  const id = useId();
  const disparador = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);

  // Se posiciona después de dibujarlo, cuando ya se conoce su tamaño.
  useLayoutEffect(() => {
    const tip = tooltip.current;
    const trig = disparador.current;
    if (!abierto || !tip || !trig) return;
    const r = trig.getBoundingClientRect();
    const { width, height } = tip.getBoundingClientRect();
    const centro = r.left + r.width / 2;
    const left = Math.max(MARGEN, Math.min(centro - width / 2, window.innerWidth - width - MARGEN));
    const arriba = r.top - height - SEPARACION >= MARGEN;
    tip.style.left = `${left}px`;
    tip.style.top = `${arriba ? r.top - height - SEPARACION : r.bottom + SEPARACION}px`;
    tip.style.setProperty('--flecha-x', `${Math.max(10, Math.min(centro - left, width - 10))}px`);
    tip.dataset.lado = arriba ? 'arriba' : 'abajo';
    tip.dataset.listo = 'true';
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto, cerrar]);

  return (
    <>
      <span
        ref={disparador}
        className={[styles.disparador, className].filter(Boolean).join(' ')}
        tabIndex={0}
        aria-describedby={abierto ? id : undefined}
        onMouseEnter={abrir}
        onMouseLeave={cerrar}
        onFocus={abrir}
        onBlur={cerrar}
        onKeyDown={(e) => { if (e.key === 'Escape') cerrar(); }}
      >
        {children}
      </span>
      {abierto && createPortal(
        <div ref={tooltip} id={id} role="tooltip" className={styles.tooltip}>
          {contenido}
        </div>,
        document.body
      )}
    </>
  );
}
