'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../../components/ui/Button/Button';
import { formatARS } from '../../../../../lib/utils/formatters';
import styles from './OperacionFormLayout.module.css';

interface OperacionFormLayoutProps {
  titulo: string;
  /** Error general devuelto por la API. */
  error?: string | null;
  /** Campos propios de cada operación (proveedor/remito, comprobante/descuento). */
  cabecera: ReactNode;
  /** Bloques de productos y pago. */
  children: ReactNode;
  /** Panel de resumen, ya armado por cada pantalla. */
  resumen: ReactNode;
  /** Total, para repetirlo en la barra inferior de pantallas angostas. */
  total: number;
  etiquetaTotal: string;
  etiquetaAccion: string;
  submitting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Estructura compartida por compra y venta: título, vuelta atrás, grilla de dos
 * columnas y barra inferior en pantallas angostas. Cada pantalla conserva su
 * estado, su cálculo y su validación; acá solo vive lo que es idéntico, para
 * que las dos no puedan divergir visualmente.
 */
export default function OperacionFormLayout({
  titulo,
  error,
  cabecera,
  children,
  resumen,
  total,
  etiquetaTotal,
  etiquetaAccion,
  submitting,
  onSubmit,
}: OperacionFormLayoutProps) {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backLink} onClick={() => router.push('/operaciones')}>
        ← Volver a operaciones
      </button>

      <h1 className={styles.pageTitle}>{titulo}</h1>

      <form onSubmit={onSubmit} className={styles.layout}>
        <div className={styles.columna}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.bloque}>
            <div className={styles.grid}>{cabecera}</div>
          </div>

          {children}
        </div>

        <div className={styles.panelLateral}>{resumen}</div>

        <div className={styles.barraMovil}>
          <div className={styles.barraMovilInfo}>
            <span className={styles.barraMovilEtiqueta}>{etiquetaTotal}</span>
            <span className={styles.barraMovilTotal}>{formatARS(total)}</span>
          </div>
          <div className={styles.barraMovilAccion}>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Guardando...' : etiquetaAccion}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
