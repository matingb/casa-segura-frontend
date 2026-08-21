import OperacionesCatalogo from './_components/OperacionesCatalogo/OperacionesCatalogo';
import styles from './operaciones.module.css';

export const metadata = {
  title: 'Operaciones | CasaSegura',
  description: 'Historial y gestión de operaciones registradas en el sistema.',
};

export default function OperacionesPage() {
  return (
    <div className={styles.page}>
      <OperacionesCatalogo />
    </div>
  );
}
