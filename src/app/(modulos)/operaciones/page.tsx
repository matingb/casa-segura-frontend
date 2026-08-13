import OperacionesCatalogo from './_components/OperacionesCatalogo/OperacionesCatalogo';
import styles from './operaciones.module.css';

export const metadata = {
  title: 'Operaciones | CasaSegura',
  description: 'Historial y gestión de operaciones registradas en el sistema.',
};

export default function OperacionesPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Operaciones</h1>
      <OperacionesCatalogo />
    </div>
  );
}
