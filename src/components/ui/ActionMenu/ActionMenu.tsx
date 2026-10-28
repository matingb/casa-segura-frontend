'use client';

import { CSSProperties, KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import styles from './ActionMenu.module.css';

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Nombre accesible del botón (ej.: "Acciones de Cámara domo"). */
  label: string;
}

/**
 * Botón ⋮ que abre un menú contextual de acciones. El menú se renderiza en un
 * portal para que no lo recorte el contenedor con scroll de una tabla, y no
 * propaga el click (la fila puede tener su propio onClick).
 */
export default function ActionMenu({ items, label }: ActionMenuProps) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<CSSProperties | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const cerrar = (devolverFoco = false) => {
    setAbierto(false);
    if (devolverFoco) botonRef.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return;

    const ubicar = () => {
      const rect = botonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const altoMenu = menuRef.current?.offsetHeight ?? 0;
      const arriba = window.innerHeight - rect.bottom < altoMenu + 8 && rect.top > altoMenu + 8;
      // Alineado al borde derecho del botón: la columna de acciones está a la derecha.
      setPosicion(
        arriba
          ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 4, right: window.innerWidth - rect.right }
      );
    };
    const clickAfuera = (e: MouseEvent) => {
      const destino = e.target as Node;
      if (!botonRef.current?.contains(destino) && !menuRef.current?.contains(destino)) cerrar();
    };

    ubicar();
    // Con el alto real del menú ya medido, se reubica por si no entra abajo.
    const frame = requestAnimationFrame(ubicar);
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    document.addEventListener('mousedown', clickAfuera);
    window.addEventListener('resize', ubicar);
    window.addEventListener('scroll', ubicar, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', clickAfuera);
      window.removeEventListener('resize', ubicar);
      window.removeEventListener('scroll', ubicar, true);
    };
  }, [abierto]);

  const moverFoco = (e: KeyboardEvent<HTMLDivElement>) => {
    const opciones = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const actual = opciones.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      opciones[(actual + 1) % opciones.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      opciones[(actual - 1 + opciones.length) % opciones.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      cerrar(true);
    }
  };

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        className={`${styles.trigger} ${abierto ? styles.triggerOpen : ''}`}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setAbierto((v) => !v);
        }}
      >
        <MoreVertical size={16} />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className={styles.menu}
            style={posicion ?? { visibility: 'hidden' }}
            onKeyDown={moverFoco}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`${styles.item} ${item.variant === 'danger' ? styles.itemDanger : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  cerrar();
                  item.onSelect();
                }}
              >
                {item.icon && <span className={styles.icon} aria-hidden="true">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
