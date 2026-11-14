'use client';

import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  /** Contenido del tooltip. */
  content?: ReactNode;
  contenido?: ReactNode;
  /** Elemento que lo dispara al pasar el mouse o al enfocarlo con el teclado. */
  children: ReactNode;
  className?: string;
  posicion?: 'top' | 'bottom';
  lado?: 'arriba' | 'abajo';
  desactivado?: boolean;
}

/** Separación entre el disparador y el tooltip, y margen mínimo contra los bordes de la ventana. */
const SEPARACION = 6;
const MARGEN = 8;

/**
 * Tooltip propio (no el `title` nativo). Se dibuja en un portal con posición
 * fija para que no lo recorte un contenedor con scroll, como el de las tablas.
 * Se abre arriba del disparador; si no entra, abajo. Se cierra al hacer scroll.
 */
export default function Tooltip({
  content,
  contenido,
  children,
  className,
  posicion,
  lado,
  desactivado = false,
}: TooltipProps) {
  const contentActual = content ?? contenido;
  const id = useId();
  const disparador = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [ladoReal, setLadoReal] = useState<'top' | 'bottom'>('top');
  const [estiloPosicion, setEstiloPosicion] = useState<CSSProperties>({});

  const abrir = useCallback(() => {
    if (desactivado || !contentActual) return;
    setAbierto(true);
  }, [desactivado, contentActual]);

  const cerrar = useCallback(() => {
    setAbierto(false);
  }, []);

  useLayoutEffect(() => {
    const tip = tooltip.current;
    const trig = disparador.current;
    if (!abierto || !tip || !trig) return;

    const r = trig.getBoundingClientRect();
    const { width, height } = tip.getBoundingClientRect();
    const centro = r.left + r.width / 2;
    const left = Math.max(MARGEN, Math.min(centro - width / 2, window.innerWidth - width - MARGEN));

    const preferenciaArriba = lado ? lado === 'arriba' : posicion ? posicion === 'top' : true;
    let arriba = preferenciaArriba;
    if (arriba && r.top - height - SEPARACION < MARGEN) {
      arriba = false;
    } else if (!arriba && r.bottom + height + SEPARACION > window.innerHeight - MARGEN) {
      arriba = true;
    }

    const top = arriba ? r.top - height - SEPARACION : r.bottom + SEPARACION;
    const flechaX = Math.max(10, Math.min(centro - left, width - 10));

    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
    tip.style.setProperty('--flecha-x', `${flechaX}px`);
    tip.dataset.lado = arriba ? 'arriba' : 'abajo';
    tip.dataset.listo = 'true';

    setLadoReal(arriba ? 'top' : 'bottom');
    setEstiloPosicion({
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      visibility: 'visible',
    });
  }, [abierto, posicion, lado]);

  useEffect(() => {
    if (!abierto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto, cerrar]);

  return (
    <>
      <span
        ref={disparador}
        className={[styles.disparador, styles.trigger, className].filter(Boolean).join(' ')}
        tabIndex={0}
        aria-describedby={abierto ? id : undefined}
        onMouseEnter={abrir}
        onMouseLeave={cerrar}
        onFocus={abrir}
        onBlur={cerrar}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cerrar();
        }}
      >
        {children}
      </span>
      {abierto &&
        createPortal(
          <div
            ref={tooltip}
            id={id}
            role="tooltip"
            className={`${styles.tooltip} ${ladoReal === 'top' ? styles.tooltipTop : styles.tooltipBottom}`}
            style={estiloPosicion}
          >
            {contentActual}
          </div>,
          document.body
        )}
    </>
  );
}
