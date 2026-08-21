'use client';

import { useRouter } from 'next/navigation';
import Modal from '../../../../../components/ui/Modal/Modal';
import styles from './NuevaOperacionModal.module.css';

interface NuevaOperacionModalProps {
  onClose: () => void;
}

const TIPOS = [
  { href: '/operaciones/nuevo/compra', title: 'Compra', description: 'Ingreso de mercadería de un proveedor.' },
  { href: '/operaciones/nuevo/venta', title: 'Venta', description: 'Salida de mercadería a un cliente.' },
  { href: '/operaciones/nuevo/traslado', title: 'Traslado', description: 'Movimiento de stock entre sucursales.' },
  { href: '/operaciones/nuevo/movimiento', title: 'Movimiento financiero', description: 'Ingreso o egreso de dinero en una cuenta.' },
];

export default function NuevaOperacionModal({ onClose }: NuevaOperacionModalProps) {
  const router = useRouter();

  return (
    <Modal title="Nueva operación" onClose={onClose}>
      <div className={styles.grid}>
        {TIPOS.map((tipo) => (
          <button
            key={tipo.href}
            type="button"
            className={styles.card}
            onClick={() => router.push(tipo.href)}
          >
            <span className={styles.cardTitle}>{tipo.title}</span>
            <span className={styles.cardDescription}>{tipo.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
