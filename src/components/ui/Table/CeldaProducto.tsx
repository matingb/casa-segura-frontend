import { ImageIcon } from 'lucide-react';
import CeldaTexto from './CeldaTexto';
import styles from './CeldaProducto.module.css';

interface CeldaProductoProps {
  nombre: string;
  imagenUrl?: string | null;
  /** Datos secundarios (ej.: código, marca, modelo); los vacíos se omiten. */
  secundarios: (string | null | undefined)[];
}

/**
 * Celda de producto para tablas: miniatura fija de 48×48 (con o sin imagen),
 * nombre en hasta 2 líneas y "código · marca · modelo" en 1, con tooltip.
 */
export default function CeldaProducto({ nombre, imagenUrl, secundarios }: CeldaProductoProps) {
  return (
    <div className={styles.celda}>
      <div className={imagenUrl ? styles.miniatura : `${styles.miniatura} ${styles.miniaturaVacia}`}>
        {imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagenUrl} alt={nombre} className={styles.miniaturaImagen} />
        ) : (
          <ImageIcon size={18} aria-hidden="true" />
        )}
      </div>
      <CeldaTexto
        principal={nombre}
        secundarias={[secundarios.filter(Boolean).join(' · ')]}
        lineasPrincipal={2}
        lineasSecundarias={1}
      />
    </div>
  );
}
