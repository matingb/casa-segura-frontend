import ClientesCatalogo from './_components/ClientesCatalogo/ClientesCatalogo';
import styles from './clientes.module.css';

export default function ClientesPage() {
  return (
    <div className={styles.page}>
      <ClientesCatalogo />
    </div>
  );
}
